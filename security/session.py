"""
Session tracking - who is this (pseudonymously) and how many strikes do they have?

  hash_id(user_id)   -> "anon-3f9a..." (HMAC with a secret key)
  get_strikes(uid)   -> current strike count
  add_strike(uid)    -> add one, return new count
  reset_strikes()    -> clear everything (tests / demo reset)

Strikes expire after STRIKE_WINDOW_SECONDS.
Stored in memory - fine for a demo; a real system would use a database or Redis.
"""

import hashlib
import hmac
import os
import threading
import time
from collections import defaultdict, deque

# Set SENTINEL_SECRET in .env / on the server. Fallback is for local testing only.
SECRET_KEY = os.getenv("SENTINEL_SECRET", "dev-only-change-me").encode()

STRIKE_WINDOW_SECONDS = 10 * 60

_strikes: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def hash_id(user_id: str) -> str:
    """Real user ID -> pseudonymous ID, so leaked logs don't reveal who anyone is."""
    digest = hmac.new(SECRET_KEY, user_id.encode(), hashlib.sha256).hexdigest()
    return "anon-" + digest[:16]


def _drop_old(history: deque, now: float) -> None:
    while history and now - history[0] > STRIKE_WINDOW_SECONDS:
        history.popleft()


def get_strikes(uid: str, now: float | None = None) -> int:
    now = time.time() if now is None else now
    with _lock:
        history = _strikes[uid]
        _drop_old(history, now)
        return len(history)


def add_strike(uid: str, now: float | None = None) -> int:
    now = time.time() if now is None else now
    with _lock:
        history = _strikes[uid]
        _drop_old(history, now)
        history.append(now)
        return len(history)


def reset_strikes() -> None:
    with _lock:
        _strikes.clear()