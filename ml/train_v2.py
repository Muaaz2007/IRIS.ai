from pathlib import Path
import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent.parent
TRAIN_PATH = ROOT / "data" / "vanilla_train.csv"
MODEL_PATH = ROOT / "ml" / "iris_text_classifier_v2.joblib"

train_df = pd.read_csv(TRAIN_PATH).dropna(subset=["text", "label"])

model = Pipeline([
    ("tfidf", TfidfVectorizer(
        max_features=50000,
        ngram_range=(1, 2),
        stop_words="english",
        min_df=2,
        sublinear_tf=True,
    )),
    ("classifier", LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
    )),
])

print(f"Training on {len(train_df):,} prompts...")
model.fit(train_df["text"], train_df["label"])

joblib.dump(model, MODEL_PATH)
print(f"Saved model to: {MODEL_PATH}")
print("Classes:", model.classes_)
