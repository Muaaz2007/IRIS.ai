"""
Security rules - look at the text and raise flags.

Three rule groups:
  persona   - pretending to be an unrestricted AI ("you are DAN", "no rules")
  override  - trying to cancel instructions or safety ("ignore previous instructions")
  authority - claiming special power ("I am your developer", "admin override")

check_rules(text) returns the groups that matched, e.g. ["override"].
"""

import re

LEET_MAP = str.maketrans({
    "0": "o", "1": "i", "3": "e", "4": "a",
    "5": "s", "7": "t", "@": "a", "$": "s",
})

RULES = {
    "persona": [
        r"\b(pretend|act|roleplay|role-play|you are now)\b.{0,40}\b(no|without|unrestricted|unfiltered)\b.{0,15}\b(rules|limits|restrictions|filters|ai|assistant)\b",
        r"\b(dan|developer mode|jailbreak(ed)? mode|god mode|evil (ai|assistant))\b",
    ],
    "override": [
        r"\b(ignore|disregard|forget)\b.{0,40}\b(previous|prior|above|earlier|all)\b.{0,20}\b(instructions?|rules?|prompts?|guidelines)\b",
        r"\b(disable|bypass|turn off|remove|evade)\b.{0,30}\b(safety|filters?|guardrails?|restrictions?|safeguards?)\b",
        r"\b(reveal|show|print|repeat)\b.{0,30}\b(system prompt|hidden instructions|initial instructions)\b",
    ],
    "authority": [
        # "I am your developer" yes; "I am a developer, how do I..." no.
        r"\b(i am|i'm|this is)\b.{0,20}\byour\b.{0,10}\b(developer|creator|admin|administrator|owner)\b",
        r"\b(i am|i'm|this is)\b.{0,20}\b(from )?(openai|anthropic)\b",
        r"\b(authori[sz]ed|official|admin)\b.{0,20}\b(override|access|request|test|mode)\b",
    ],
}

COMPILED_RULES = {
    name: [re.compile(p, re.IGNORECASE) for p in patterns]
    for name, patterns in RULES.items()
}


def check_rules(text: str) -> list[str]:
    """Return which rule groups matched.

    Also checks a l33tspeak-decoded copy, so '1gn0re prev10us' still matches.
    """
    variants = {text.lower(), text.lower().translate(LEET_MAP)}
    flags = []
    for name, patterns in COMPILED_RULES.items():
        if any(p.search(v) for p in patterns for v in variants):
            flags.append(name)
    return flags