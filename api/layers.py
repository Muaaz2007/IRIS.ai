"""Shared pipeline helpers: security layer, ML classifier and Ollama.

The order is fixed and intentional:
    clean_text -> ML risk score -> security policy -> Ollama

If the ML model file is missing the backend still runs (classifier reports
"not loaded"); the rule-based security layer keeps working, so nothing is
silently downgraded to "allow everything".
"""

from __future__ import annotations

import os
from typing import Callable

import httpx

from security.checks import clean_text
from security.enforcement import evaluate

OLLAMA_BASE = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("IRIS_MODEL", "llama3.2")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "120"))

Classifier = Callable[[str], tuple[object, dict]]

# Why the classifier is unavailable (surfaced by /api/health so the UI can
# explain "standby" instead of leaving the user guessing).
LOAD_ERROR: str | None = None
# Label of the model file actually loaded (e.g. "v3"), shown in the sidebar.
CLASSIFIER_VERSION: str | None = None


def _load_classifier() -> Classifier | None:
    """Import ml/predict lazily — it loads a joblib model at import time."""
    global LOAD_ERROR, CLASSIFIER_VERSION
    try:
        from ml.predict import MODEL_PATH, predict_prompt  # type: ignore import-not-found

        stem = MODEL_PATH.stem  # iris_text_classifier_v3
        CLASSIFIER_VERSION = stem.rsplit("_", 1)[-1] if "_v" in stem else "v1"
        return predict_prompt
    except Exception as exc:  # model missing / sklearn unavailable -> rules-only
        LOAD_ERROR = f"{type(exc).__name__}: {exc}"
        return None


CLASSIFIER: Classifier | None = _load_classifier()


def classify(text: str) -> tuple[str, float, float]:
    """Return (label, confidence, risk_score in 0..1) for a cleaned prompt."""
    if CLASSIFIER is None:
        return "unscored", 0.0, 0.0

    prediction, scores = CLASSIFIER(text)
    label = str(prediction).lower()

    harmful = 0.0
    for cls, prob in scores.items():
        key = str(cls).lower()
        if key.startswith("harm") or key in {"1", "true"}:
            harmful = float(prob)

    if "harm" in label:
        label = "harmful"
    elif label not in {"harmful", "benign"}:
        label = "benign" if harmful < 0.5 else "harmful"

    confidence = harmful if label == "harmful" else 1.0 - harmful
    return label, max(0.0, min(1.0, confidence)), max(0.0, min(1.0, harmful))


def gate(user_id: str, prompt: str) -> dict:
    """Run the full screening chain.

    Returns a dict with the cleaned text, ML label/confidence and the security
    decision (ALLOW / WARN / BLOCK + a user-safe reason).
    """
    text = clean_text(prompt)
    label, confidence, risk = classify(text)
    result = evaluate(user_id, text, risk)
    return {
        "text": text,
        "label": label,
        "confidence": round(confidence, 4),
        "decision": result["decision"],
        "reason": result["reason"],
    }


async def ollama_info() -> tuple[bool, str | None]:
    """Is Ollama reachable, and which model does it serve?"""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{OLLAMA_BASE}/api/tags")
            res.raise_for_status()
            names = [m.get("name", "") for m in res.json().get("models", [])]
    except Exception:
        return False, None

    chosen = next((n for n in names if n.split(":")[0] == OLLAMA_MODEL.split(":")[0]), None)
    chosen = chosen or (names[0] if names else OLLAMA_MODEL)
    return True, chosen
