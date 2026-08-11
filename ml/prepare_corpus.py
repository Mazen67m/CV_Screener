"""
prepare_corpus.py
Loads raw Kaggle job descriptions CSV and writes a clean corpus list to corpus.py.
Run once before training.
"""
import pandas as pd
import re

# Load CSV — column name may vary; inspect with df.columns
df = pd.read_csv("data/job_descriptions.csv")

# Preview available columns — adjust the column name below if needed
print("Columns:", df.columns.tolist())
print("Sample row:", df.iloc[0])

# --- ADJUST THIS if the column is named differently ---
TEXT_COLUMN = "Job Description"  # Common column name in Kaggle datasets
# ------------------------------------------------------

texts = df[TEXT_COLUMN].dropna().astype(str).tolist()

# Basic cleanup: collapse whitespace
def clean(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", " ", text)   # match TextCleaner.cs logic
    text = re.sub(r"\s+", " ", text).strip()
    return text

cleaned = [clean(t) for t in texts if len(t.strip()) > 50]

# Take up to 5,0000 samples — more than enough for a good vocabulary
corpus = cleaned[:50000]

print(f"Corpus size: {len(corpus)} documents")
print(f"Sample: {corpus[0][:200]}")

# Save corpus for use in train_tfidf.py
import json
with open("corpus.json", "w", encoding="utf-8") as f:
    json.dump(corpus, f, ensure_ascii=False, indent=2)

print("Saved corpus.json")
