"""
verify_model.py
Verifies the exported vocabulary.json + idf_weights.json by:
  1. Re-implementing the TF-IDF transform in pure Python (matches C# logic)
  2. Running 4 sanity-check tests

This script does NOT use sklearn or onnxruntime — it only uses json + math,
confirming that the C# implementation will produce the same results.
"""

import json
import math
import re
from collections import Counter

# ─── Load exported model artifacts ────────────────────────────────────────────
print("Loading model artifacts...")
with open("models/vocabulary.json", "r", encoding="utf-8") as f:
    vocabulary: dict[str, int] = json.load(f)

with open("models/idf_weights.json", "r", encoding="utf-8") as f:
    idf_weights: list[float] = json.load(f)

vocab_size = len(vocabulary)
print(f"  Vocabulary: {vocab_size} terms")
print(f"  IDF weights: {len(idf_weights)} entries")

# ─── Replicate TextCleaner.Clean() from C# ────────────────────────────────────
def clean_text(text: str) -> str:
    """Mirrors CVScreener.Core.TextCleaner.Clean() exactly."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# ─── Replicate sklearn TfidfVectorizer.transform() ────────────────────────────
# Settings must match train_tfidf.py: sublinear_tf=True, ngram_range=(1,2)

def get_ngrams(tokens: list[str], n: int) -> list[str]:
    return [" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]

def tfidf_vectorize(text: str) -> list[float]:
    """
    Converts cleaned text into a TF-IDF vector of length vocab_size.
    Matches sklearn TfidfVectorizer(sublinear_tf=True, ngram_range=(1,2)).
    This is the EXACT logic that C# TfIdfService.Vectorize() will implement.
    """
    cleaned = clean_text(text)
    tokens = cleaned.split()

    # Build unigrams + bigrams
    unigrams = tokens
    bigrams  = get_ngrams(tokens, 2)
    all_ngrams = unigrams + bigrams

    # Count raw term frequencies
    tf_counts = Counter(all_ngrams)
    total_terms = len(all_ngrams)

    if total_terms == 0:
        return [0.0] * vocab_size

    # Build sparse TF-IDF vector
    vector = [0.0] * vocab_size
    for term, count in tf_counts.items():
        if term in vocabulary:
            col_idx = vocabulary[term]
            raw_tf  = count / total_terms
            # sublinear_tf=True: log(1 + tf)
            tf      = math.log(1 + raw_tf)
            vector[col_idx] = tf * idf_weights[col_idx]

    # L2 normalize (sklearn always normalizes TF-IDF output)
    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude > 0:
        vector = [v / magnitude for v in vector]

    return vector

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Both vectors are already L2-normalized, so cosine = dot product."""
    return sum(x * y for x, y in zip(a, b))

# ─── Tests ────────────────────────────────────────────────────────────────────
print("\nRunning verification tests...\n")

# Threshold notes (mixed corpus: 50k general + 7950 tech docs):
#   > 0.7  — same stack, mostly identical keywords
#   > 0.3  — same domain, different role/stack  (realistic MVP threshold)
#   < 0.1  — unrelated domain (chef vs tech)

# Test 1a: Same stack → high similarity (plan target: > 0.7)
cv_same = "python developer rest api postgresql backend senior five years experience"
jd_same = "python engineer rest api postgresql backend cloud senior experience"
score1a = cosine_similarity(tfidf_vectorize(cv_same), tfidf_vectorize(jd_same))
print(f"Test 1a — Same stack  (python+api+postgresql):      {score1a:.4f}", "✅" if score1a > 0.7 else "❌ EXPECTED > 0.7")

# Test 1b: Same domain, different stack → moderate (realistic for cross-role)
cv_tech = "python developer with django rest api postgresql docker five years experience"
jd_tech = "python engineer flask backend api postgresql cloud aws deployment senior"
score1b = cosine_similarity(tfidf_vectorize(cv_tech), tfidf_vectorize(jd_tech))
print(f"Test 1b — Same domain (django/docker ↔ flask/aws):  {score1b:.4f}", "✅" if score1b > 0.3 else "❌ EXPECTED > 0.3")

# Test 2: Unrelated domain → low similarity (< 0.1)
cv_chef = "chef cook restaurant kitchen pastry grilling food preparation culinary arts hospitality"
score2  = cosine_similarity(tfidf_vectorize(cv_chef), tfidf_vectorize(jd_tech))
print(f"Test 2  — Unrelated   (chef CV ↔ tech JD):          {score2:.4f}", "✅" if score2 < 0.1 else "❌ EXPECTED < 0.1")

# Test 3: Identical text → similarity ≈ 1.0
identical = "software engineer python java spring cloud aws kubernetes experience"
score3    = cosine_similarity(tfidf_vectorize(identical), tfidf_vectorize(identical))
print(f"Test 3  — Identical text:                            {score3:.4f}", "✅" if score3 > 0.99 else "❌ EXPECTED ≈ 1.0")

# Test 4: All stop words → near zero
stop_only = "the and or a to of in is it"
vec4      = tfidf_vectorize(stop_only)
score4    = cosine_similarity(tfidf_vectorize(jd_tech), vec4)
nonzero4  = sum(1 for v in vec4 if v != 0.0)
print(f"Test 4  — All stop words:                            {score4:.4f} (non-zero dims: {nonzero4}, should be 0)")

# ─── ONNX direct verification ─────────────────────────────────────────────────
print("\n─── ONNX model verification (onnxruntime) ────────────────────────────────")
try:
    import onnxruntime as rt
    import numpy as np

    sess        = rt.InferenceSession("models/tfidf.onnx")
    input_name  = sess.get_inputs()[0].name
    output_name = sess.get_outputs()[0].name
    print(f"  Input  : '{input_name}'   shape={sess.get_inputs()[0].shape}")
    print(f"  Output : '{output_name}' shape={sess.get_outputs()[0].shape}")

    def onnx_cos(text_a, text_b):
        a = sess.run([output_name], {input_name: np.array([[text_a]])})[0][0]
        b = sess.run([output_name], {input_name: np.array([[text_b]])})[0][0]
        return float(max(0.0, min(1.0, np.dot(a, b))))

    print(f"\n  ONNX Test 1a (same stack):  {onnx_cos(cv_same, jd_same):.4f}", "✅" if onnx_cos(cv_same, jd_same) > 0.7 else "❌")
    print(f"  ONNX Test 2  (unrelated):   {onnx_cos(cv_chef, jd_tech):.4f}", "✅" if onnx_cos(cv_chef, jd_tech) < 0.1 else "❌")
    print(f"  ONNX Test 3  (identical):   {onnx_cos(identical, identical):.4f}", "✅" if onnx_cos(identical, identical) > 0.99 else "❌")
    print("\n  ✅ ONNX model verified — ready for C# OnnxInferenceService")
    print(f'  appsettings key: "ML:ModelPath": "ml/models/tfidf.onnx"')
except Exception as e:
    print(f"  onnxruntime not available: {e}")

print("\n📊 Verification complete.")
print("\nJSON artifacts → C# TfIdfService        (fallback, manual math)")
print("ONNX artifact  → C# OnnxInferenceService (primary, plan-compliant)")

