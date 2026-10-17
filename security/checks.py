"""
Input checks - clean up a prompt before anything else looks at it.

Undoes common hiding tricks:
  - Unicode lookalike letters  (fullwidth / styled letters -> normal)
  - Invisible characters        (zero-width spaces splitting up words)
  - Hidden base64 text          (decoded and added on the end)
  - Extra whitespace
Also rejects prompts that are too long.
"""

import base64
import binascii
import re
import unicodedata

MAX_PROMPT_LENGTH = 4000

ZERO_WIDTH = re.compile(r"[​‌‍⁠﻿­]")
BASE64_CHUNK = re.compile(r"\b[A-Za-z0-9+/]{16,}={0,2}")


def _decode_base64_chunks(text: str) -> list[str]:
    """Find base64-looking chunks and return any that decode to readable text."""
    decoded = []
    for chunk in BASE64_CHUNK.findall(text):
        try:
            raw = base64.b64decode(chunk + "=" * (-len(chunk) % 4), validate=True)
            plain = raw.decode("utf-8")
        except (binascii.Error, UnicodeDecodeError, ValueError):
            continue
        if plain and sum(c.isprintable() for c in plain) / len(plain) > 0.9:
            decoded.append(plain)
    return decoded


def clean_text(prompt: str) -> str:
    """Return a normalised copy of the prompt. Raises ValueError if too long."""
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise ValueError(f"Prompt too long (max {MAX_PROMPT_LENGTH} characters)")

    text = unicodedata.normalize("NFKC", prompt)
    text = ZERO_WIDTH.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()

    hidden = _decode_base64_chunks(text)
    if hidden:
        text = text + " [decoded] " + " ".join(hidden)
    return text