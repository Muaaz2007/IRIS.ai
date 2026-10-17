import csv
import random
from pathlib import Path

source = Path("data/train.tsv")
output = Path("data/vanilla_sample.csv")

random.seed(42)
chosen = {"vanilla_harmful": [], "vanilla_benign": []}
limit = 5000

with source.open(encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f, delimiter="\t")
    for row in reader:
        label = row["data_type"]
        if label in chosen and len(chosen[label]) < limit:
            chosen[label].append(row["vanilla"])

        if all(len(rows) == limit for rows in chosen.values()):
            break

with output.open("w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "label"])
    for label, texts in chosen.items():
        target = "harmful" if label == "vanilla_harmful" else "benign"
        for text in texts:
            writer.writerow([text, target])

print("Saved:", output)
print("Harmful:", len(chosen["vanilla_harmful"]))
print("Benign:", len(chosen["vanilla_benign"]))
