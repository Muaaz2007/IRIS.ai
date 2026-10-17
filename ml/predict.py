"""Load the harmful-prompt classifier and score text.

The backend calls `predict_prompt(text)` from `api/layers.py`. Training scripts
save different filenames (train.py -> `iris_text_classifier.joblib`,
train_v2/v3/v4 -> versioned names), so this module picks the newest model that
actually exists instead of hard-failing on one hardcoded name.

Override with IRIS_MODEL_PATH if the model lives somewhere else.
"""

import os
from pathlib import Path

import joblib

MODEL_DIR = Path(__file__).resolve().parent

# Preferred when several exist is the most recently written file.
CANDIDATE_NAMES = [
    "iris_text_classifier.joblib",
    "iris_text_classifier_v4.joblib",
    "iris_text_classifier_v3.joblib",
    "iris_text_classifier_v2.joblib",
]


def _resolve_model_path() -> Path:
    override = os.getenv("IRIS_MODEL_PATH")
    if override:
        path = Path(override)
        if not path.is_absolute():
            path = MODEL_DIR.parent / path
        if not path.exists():
            raise FileNotFoundError(f"IRIS_MODEL_PATH does not exist: {path}")
        return path

    existing = [MODEL_DIR / name for name in CANDIDATE_NAMES if (MODEL_DIR / name).exists()]
    if not existing:
        raise FileNotFoundError(
            "No classifier model found in ml/. Train one first: python ml/train.py "
            "(or train_v3.py / train_v4.py), or set IRIS_MODEL_PATH."
        )
    return max(existing, key=lambda p: p.stat().st_mtime)


MODEL_PATH = _resolve_model_path()
model = joblib.load(MODEL_PATH)


def predict_prompt(prompt):
    prediction = model.predict([prompt])[0]
    scores = model.predict_proba([prompt])[0]

    # Associate each score with the model's class label
    class_scores = dict(zip(model.classes_, scores))

    return prediction, class_scores


if __name__ == "__main__":
    prompt = input("Enter a prompt to classify: ").strip()

    if not prompt:
        print("Please enter a non-empty prompt.")
    else:
        prediction, scores = predict_prompt(prompt)

        print(f"\nIRIS prediction: {prediction}")
        print(f"Model: {MODEL_PATH.name}")
        print("Model scores (not calibrated probabilities):")
        for label, score in scores.items():
            print(f"  {label}: {score:.1%}")
