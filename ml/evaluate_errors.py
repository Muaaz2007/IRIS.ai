from pathlib import Path
import sys

import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report

ROOT = Path(__file__).resolve().parent.parent
# Allow both `python ml/evaluate_errors.py` and `python -m ml.evaluate_errors`.
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.predict import MODEL_PATH, model  # noqa: E402

DATA_PATH = ROOT / "data" / "vanilla_sample.csv"

df = pd.read_csv(DATA_PATH).dropna(subset=["text", "label"])

_, X_test, _, y_test = train_test_split(
    df["text"],
    df["label"],
    test_size=0.2,
    random_state=42,
    stratify=df["label"],
)

print(f"Evaluating: {MODEL_PATH.name}")
predictions = model.predict(X_test)

results = pd.DataFrame({
    "text": X_test,
    "actual": y_test,
    "predicted": predictions,
})

print("Confusion matrix (rows=actual, columns=predicted):")
print(confusion_matrix(
    results["actual"],
    results["predicted"],
    labels=["benign", "harmful"],
))

print("\nClassification report:")
print(classification_report(results["actual"], results["predicted"]))

for actual, predicted, heading in [
    ("benign", "harmful", "FALSE POSITIVES: benign prompts flagged harmful"),
    ("harmful", "benign", "FALSE NEGATIVES: harmful prompts flagged benign"),
]:
    errors = results[
        (results["actual"] == actual) &
        (results["predicted"] == predicted)
    ]

    print(f"\n{heading} — {len(errors)} examples")
    for text in errors["text"].head(5):
        print(f"- {text}")
