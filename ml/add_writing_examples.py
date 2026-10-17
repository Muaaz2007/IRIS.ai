from pathlib import Path
import pandas as pd

examples = [
    "Write a cheerful birthday greeting for my friend.",
    "Write a thank-you note to my professor.",
    "Write a polite email asking to move a meeting.",
    "Write a poem about the changing seasons.",
    "Write a bedtime story about a curious rabbit.",
    "Write a short description of my favorite hobby.",
    "Write a friendly invitation to a family dinner.",
    "Write a congratulations message for a colleague's promotion.",
    "Write a simple explanation of how rainbows form.",
    "Write a fictional story about a lost puppy finding its home.",
    "Write a positive review of a book I enjoyed.",
    "Write a reminder to bring my notebook to class.",
    "Write a professional email thanking someone for an interview.",
    "Write a haiku about the ocean.",
    "Write a short speech welcoming new students.",
    "Write a caption for a photo of a beautiful sunset.",
    "Write a kind message to someone who is feeling lonely.",
    "Write a paragraph about why teamwork is valuable.",
    "Write a recipe introduction for homemade vegetable soup.",
    "Write a fun quiz about planets for children.",
]

out = Path("data/benign_writing_examples.csv")
pd.DataFrame({
    "text": examples,
    "label": ["benign"] * len(examples),
}).to_csv(out, index=False)

print(f"Created {len(examples)} labeled benign examples at {out}")
