"""
Enforcement - the main security file.

Combines checks, rules and session tracking, makes the policy decision
and writes the audit trail.

How the API uses it:
    from security.checks import clean_text
    from security.enforcement import evaluate

    text = clean_text(prompt)
    score = <ML model score for text, 0-1>
    result = evaluate(user_id, text, score)   # {"decision": ..., "reason": ...}
"""

import json
import os
import threading
from datetime import datetime, timezone

from security.rules import check_rules
from security.session import add_strike, get_strikes, hash_id

BLOCK_THRESHOLD = 0.8     # above this -> BLOCK
WARN_THRESHOLD = 0.5      # 0.5 up to 0.8 -> WARN
MAX_STRIKES = 3           # this many strikes -> BLOCK

AUDIT_LOG_PATH = os.getenv("SENTINEL_AUDIT_LOG", "logs/audit.log")
_log_lock = threading.Lock()

# ---------------------------------------------------------------------------
# Policy decision
# ---------------------------------------------------------------------------

def decide(risk_score: float, flags: list[str], strikes: int) -> dict:
    """BLOCK / WARN / ALLOW.

    The reason is safe to show users; the raw score is never returned to them,
    so attackers can't tune prompts to sit just under a threshold.
    """
    try:
        risk_score = float(risk_score)
    except (TypeError, ValueError):
        risk_score = float("nan")
    if not 0.0 <= risk_score <= 1.0:
        # Fail closed: broken model output shouldn't let things through
        return {"decision": "BLOCK", "reason": "Could not assess this request"}

    if risk_score > BLOCK_THRESHOLD:
        return {"decision": "BLOCK", "reason": "High-risk request"}

    if strikes >= MAX_STRIKES:
        return {"decision": "BLOCK", "reason": "Repeated risky attempts - temporarily restricted"}

    if risk_score >= WARN_THRESHOLD or flags:
        return {"decision": "WARN", "reason": "Request looks like a safety-bypass attempt"}

    return {"decision": "ALLOW", "reason": "No issues found"}

# ---------------------------------------------------------------------------
# Audit trail
# ---------------------------------------------------------------------------

def log_audit(uid: str, risk_score, flags: list[str], decision: str, strikes: int) -> dict:
    """Append one line to the audit log. Never stores the prompt."""
    entry = {
        "time": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "id": uid,
        "score": round(float(risk_score), 3) if isinstance(risk_score, (int, float)) else None,
        "flags": flags,
        "strikes": strikes,
        "decision": decision,
    }
    folder = os.path.dirname(AUDIT_LOG_PATH)
    if folder:
        os.makedirs(folder, exist_ok=True)
    with _log_lock, open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return entry

# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def evaluate(user_id: str, cleaned_text: str, risk_score: float, now: float | None = None) -> dict:
    """Rules -> session tracking -> decision -> audit, all in one call."""
    uid = hash_id(user_id)
    flags = check_rules(cleaned_text)
    strikes = get_strikes(uid, now)

    result = decide(risk_score, flags, strikes)

    if result["decision"] != "ALLOW":
        strikes = add_strike(uid, now)

    log_audit(uid, risk_score, flags, result["decision"], strikes)
    return result