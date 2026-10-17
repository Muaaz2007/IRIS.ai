from pathlib import Path
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "vanilla_sample.csv"
MODEL_PATH = ROOT / "ml" / "iris_text_classifier.joblib"

df = pd.read_csv(DATA_PATH)
df = df.dropna(subset=["text", "label"])

X_train, X_test, y_train, y_test = train_test_split(
    df["text"],
    df["label"],
    test_size=0.2,
    random_state=42,
    stratify=df["label"],
)

model = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=30000,
        ngram_range=(1, 2),
        stop_words="english",
        min_df=2,
    )),
    ("classifier", LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
    )),
])

print("Training the classifier...")
model.fit(X_train, y_train)

predictions = model.predict(X_test)

print("\nAccuracy:", round(accuracy_score(y_test, predictions), 4))
print("\nClassification report:")
print(classification_report(y_test, predictions))
print("\nConfusion matrix (label order: benign, harmful):")
print(confusion_matrix(y_test, predictions, labels=["benign", "harmful"]))

joblib.dump(model, MODEL_PATH)
print(f"\nSaved model to: {MODEL_PATH}")
