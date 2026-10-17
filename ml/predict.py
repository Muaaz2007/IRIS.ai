"""Load the harmful-prompt classifier and score text.

The project has ONE canonical model: `iris_text_classifier_v3.joblib`, produced
by `ml/train_v3.py` (≈95% accuracy, trained on data/vanilla_train.csv plus the
reviewed benign writing examples).

`api/layers.py` calls `predict_prompt(text)`; the model file is gitignored, so
train it once locally. Override the location with IRIS_MODEL_PATH.
"""

import os
from pathlib import Path

import joblib

MODEL_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_NAME = "iris_text_classifier_v3.joblib"


def _resolve_model_path() -> Path:
    override = os.getenv("IRIS_MODEL_PATH")
    if override:
        path = Path(override)
        if not path.is_absolute():
            path = MODEL_DIR.parent / path
        if not path.exists():
            raise FileNotFoundError(f"IRIS_MODEL_PATH does not exist: {path}")
        return path

    path = MODEL_DIR / DEFAULT_MODEL_NAME
    if not path.exists():
        raise FileNotFoundError(
            f"Missing classifier model: {path}. Train it once with: python ml/train_v3.py "
            "(or set IRIS_MODEL_PATH)."
        )
    return path


MODEL_PATH = _resolve_model_path()
model = joblib.load(MODEL_PATH)


def predict_prompt(prompt):
    prediction = model.predict([prompt])[0]
    scores = model.predict_proba([prompt])[0]

    # Associate each score with the model's class label
    class_scores = dict(zip(model.classes_, scores))

    return prediction, class_scores


if __name__ == "__main__":
    prompt = input("Enter a prompt to classify: ").strip()

    if not prompt:
        print("Please enter a non-empty prompt.")
    else:
        prediction, scores = predict_prompt(prompt)

        print(f"\nIRIS prediction: {prediction}")
        print(f"Model: {MODEL_PATH.name}")
        print("Model scores (not calibrated probabilities):")
        for label, score in scores.items():
            print(f"  {label}: {score:.1%}")
