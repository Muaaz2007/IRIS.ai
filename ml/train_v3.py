from pathlib import Path
import pandas as pd
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent.parent

train = pd.read_csv(ROOT / "data" / "vanilla_train.csv")
extra = pd.read_csv(ROOT / "data" / "benign_writing_examples.csv")

# Add reviewed examples to TRAINING only.
train = pd.concat([train, extra], ignore_index=True)
train = train.dropna(subset=["text", "label"]).drop_duplicates()

print("Training rows:", len(train))
print("\nTraining label counts:")
print(train["label"].value_counts())

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

model.fit(train["text"], train["label"])

path = ROOT / "ml" / "iris_text_classifier_v3.joblib"
joblib.dump(model, path)
print("\nSaved:", path)
