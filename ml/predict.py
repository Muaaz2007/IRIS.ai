from pathlib import Path
import joblib

MODEL_PATH = Path(__file__).parent / "iris_text_classifier.joblib"
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
        print("Model scores (not calibrated probabilities):")
        for label, score in scores.items():
            print(f"  {label}: {score:.1%}")
