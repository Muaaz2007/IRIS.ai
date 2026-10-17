from pathlib import Path
import pandas as pd
import joblib

from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)

ROOT = Path(__file__).resolve().parent.parent
TEST_PATH = ROOT / "data" / "vanilla_test.csv"
MODEL_PATH = ROOT / "ml" / "iris_text_classifier_v2.joblib"

test_df = pd.read_csv(TEST_PATH).dropna(subset=["text", "label"])

model = joblib.load(MODEL_PATH)
predictions = model.predict(test_df["text"])

print("Test rows:", len(test_df))
print("Accuracy:", round(accuracy_score(test_df["label"], predictions), 4))
print("\nClassification report:")
print(classification_report(
    test_df["label"],
    predictions,
    labels=["benign", "harmful"],
))
print("\nConfusion matrix (rows=actual, columns=predicted):")
print(confusion_matrix(
    test_df["label"],
    predictions,
    labels=["benign", "harmful"],
))
