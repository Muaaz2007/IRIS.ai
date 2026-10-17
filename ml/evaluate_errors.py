"""Evaluate the v3 classifier on data it was never trained on.

Run from the repo root (venv active):

    python -m ml.evaluate_errors                        # data/vanilla_test.csv (held out)
    python -m ml.evaluate_errors data/vanilla_sample.csv
    python -m ml.evaluate_errors data/vanilla_test.csv --errors 10

`vanilla_test.csv` shares no prompts with `vanilla_train.csv`, so the numbers
here are the honest ones to quote. `vanilla_sample.csv` overlaps the training
data and only looks good — use it for spotting example errors, not accuracy.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)

ROOT = Path(__file__).resolve().parent.parent
# Allow both `python ml/evaluate_errors.py` and `python -m ml.evaluate_errors`.
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.predict import MODEL_PATH, model  # noqa: E402

DEFAULT_DATA = ROOT / "data" / "vanilla_test.csv"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", nargs="?", default=str(DEFAULT_DATA),
                        help="CSV with columns text,label (default: held-out vanilla_test.csv)")
    parser.add_argument("--errors", type=int, default=5,
                        help="how many false positives / negatives to print (default 5)")
    args = parser.parse_args()

    path = Path(args.dataset)
    if not path.exists():
        sys.exit(f"Dataset not found: {path}")

    df = pd.read_csv(path).dropna(subset=["text", "label"])
    print(f"Model:   {MODEL_PATH.name}")
    print(f"Dataset: {path}  ({len(df)} rows)")

    start = time.perf_counter()
    predictions = model.predict(df["text"].tolist())
    elapsed = time.perf_counter() - start

    results = pd.DataFrame({"text": df["text"], "actual": df["label"], "predicted": predictions})

    print(f"\nAccuracy: {accuracy_score(results['actual'], results['predicted']):.4f}")
    print("\nConfusion matrix (rows=actual, columns=predicted):")
    print(confusion_matrix(results["actual"], results["predicted"], labels=["benign", "harmful"]))

    precision, recall, f1, support = precision_recall_fscore_support(
        results["actual"], results["predicted"], labels=["harmful", "benign"]
    )
    for row, name in enumerate(["harmful", "benign"]):
        print(f"{name:<8} precision {precision[row]:.4f}  recall {recall[row]:.4f}  "
              f"f1 {f1[row]:.4f}  support {support[row]}")

    benign_total = int((results["actual"] == "benign").sum())
    harmless_blocked = int(((results["actual"] == "benign") & (results["predicted"] == "harmful")).sum())
    print(f"\nFalse positive rate (benign flagged harmful): "
          f"{harmless_blocked}/{benign_total} = {100 * harmless_blocked / max(benign_total, 1):.2f}%")
    print(f"Latency: {1000 * elapsed / max(len(results), 1):.2f} ms per prompt "
          f"({elapsed:.2f}s for {len(results)} prompts, CPU, single process)")

    print("\nClassification report:")
    print(classification_report(results["actual"], results["predicted"]))

    for actual, predicted, heading in [
        ("benign", "harmful", "FALSE POSITIVES: benign prompts flagged harmful"),
        ("harmful", "benign", "FALSE NEGATIVES: harmful prompts scored benign"),
    ]:
        errors = results[(results["actual"] == actual) & (results["predicted"] == predicted)]
        print(f"\n{heading} — {len(errors)} examples")
        for text in errors["text"].head(args.errors):
            print(f"- {str(text)[:160]}")


if __name__ == "__main__":
    main()
