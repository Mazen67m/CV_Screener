# Phase 1 — ML Deep Dive: Detailed Implementation Plan

> **Goal**: Build, train, export, and verify the TF-IDF ONNX model that powers the 50% TextSimilarity signal.  
> **Time estimate**: ~8 hours (Days 1 PM – 2)  
> **Output**: `ml/models/tfidf.onnx` + verified Python test passing

---

## Overview

Phase 1 has **5 milestones**:

| # | Milestone | Estimated Time |
|---|-----------|----------------|
| M1 | Python environment setup | 15 min |
| M2 | Corpus acquisition & preparation | 1.5 h |
| M3 | Train & export TF-IDF → ONNX | 30 min |
| M4 | Verify ONNX model in Python | 30 min |
| M5 | Wire ONNX into .NET (OnnxInferenceService stub) | 2 h |

---

## M1 — Python Environment Setup *(~15 min)*

> [!IMPORTANT]
> This must be done inside the `ml/` folder. All Python scripts live there.

### Step 1.1 — Check Python version
Open a terminal in the project root:
```powershell
python --version
# Must be Python 3.9+ (3.11 recommended)
# If missing: https://www.python.org/downloads/
```

### Step 1.2 — Create a virtual environment
```powershell
cd "h:\CV Screener .net + next.js\ml"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

> [!NOTE]
> If PowerShell blocks activation: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Step 1.3 — Install dependencies

The [requirements.txt](file:///h:/CV%20Screener%20.net%20+%20next.js/ml/requirements.txt) already exists with pinned versions:
```
scikit-learn==1.4.2
skl2onnx==1.16.0
onnxruntime==1.18.0
numpy==1.26.4
pandas==2.2.2
```

Run:
```powershell
pip install -r requirements.txt
```

### Step 1.4 — Verify installation
```powershell
python -c "import sklearn, skl2onnx, onnxruntime, numpy; print('All OK')"
# Expected: All OK
```

**✅ M1 Checkpoint**: `All OK` printed with no import errors.

---

## M2 — Corpus Acquisition & Preparation *(~1.5 h)*

> [!IMPORTANT]
> The TF-IDF vectorizer **must be fit on a corpus** before it can score any text. The quality of the vocabulary depends entirely on the corpus. More real JDs = better vocabulary = more accurate TextSimilarity scores.

### What is a corpus?
A list of strings — raw job description text. The vectorizer reads these to:
1. Build a **vocabulary** (the top 5,000 most meaningful words/phrases)
2. Compute **IDF weights** (how rare each word is across all documents)

These become permanently baked into `tfidf.onnx`.

---

### Option A — Kaggle Dataset (Recommended, ~1 h)

**Why**: 250k+ real job listings covering all industries. Better vocabulary diversity.

#### Step 2A.1 — Download the dataset
1. Go to [Kaggle Job Descriptions Dataset](https://www.kaggle.com/datasets/ravindrasinghrana/job-description-dataset)
2. Download `job_descriptions.csv`
3. Place it at: `ml/data/job_descriptions.csv` (create the `data/` folder)

#### Step 2A.2 — Create `ml/prepare_corpus.py`
Create this file at `h:\CV Screener .net + next.js\ml\prepare_corpus.py`:

```python
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

# Take up to 5,000 samples — more than enough for a good vocabulary
corpus = cleaned[:5000]

print(f"Corpus size: {len(corpus)} documents")
print(f"Sample: {corpus[0][:200]}")

# Save corpus for use in train_tfidf.py
import json
with open("corpus.json", "w", encoding="utf-8") as f:
    json.dump(corpus, f, ensure_ascii=False, indent=2)

print("Saved corpus.json")
```

Run it:
```powershell
python prepare_corpus.py
```

**Expected output**: `Corpus size: 5000 documents`, `Saved corpus.json`

---

### Option B — Manual Minimal Corpus (~15 min, MVP fallback)

> [!NOTE]
> Use this only if Kaggle download is blocked. A 100-document corpus gives a basic vocabulary — good enough for an MVP demo.

Create `ml/corpus.json` manually with an array of 100+ diverse job description strings. Each string should be 50–300 words. Cover at least: Software Engineering, Data Science, Product Management, DevOps, Design, Marketing.

**✅ M2 Checkpoint**: `ml/corpus.json` exists and contains 100–5,000 strings.

---

## M3 — Train & Export TF-IDF → ONNX *(~30 min)*

### Step 3.1 — Create `ml/train_tfidf.py`

Create this file at `h:\CV Screener .net + next.js\ml\train_tfidf.py`:

```python
"""
train_tfidf.py
Trains a TF-IDF vectorizer on the job description corpus,
then exports it as an ONNX model to ml/models/tfidf.onnx.

Run once. Re-run if you update the corpus.
"""

import os
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import StringTensorType

# ─── 1. Load corpus ───────────────────────────────────────────────────────────
print("Loading corpus...")
with open("corpus.json", "r", encoding="utf-8") as f:
    corpus = json.load(f)

print(f"  Loaded {len(corpus)} documents")

# ─── 2. Fit TF-IDF Vectorizer ─────────────────────────────────────────────────
print("Fitting TfidfVectorizer...")
vectorizer = TfidfVectorizer(
    max_features=5000,       # vocabulary cap — top 5,000 terms by corpus-wide TF-IDF score
    ngram_range=(1, 2),      # unigrams + bigrams: treats "machine learning" as one feature
    sublinear_tf=True,       # replaces raw TF with log(1 + TF) — reduces outlier impact
    stop_words="english",    # removes "the", "and", "of", etc. (built-in NLTK list)
    min_df=2,                # ignore terms that appear in fewer than 2 documents (noise)
    max_df=0.95,             # ignore terms in >95% of documents (too common to be useful)
)

vectorizer.fit(corpus)

print(f"  Vocabulary size: {len(vectorizer.vocabulary_)}")
print(f"  Sample vocab: {list(vectorizer.vocabulary_.keys())[:10]}")

# ─── 3. Quick sanity check before export ──────────────────────────────────────
sample_vector = vectorizer.transform(["python developer django rest api"]).toarray()
print(f"  Sample vector shape: {sample_vector.shape}")  # expected (1, 5000)
print(f"  Non-zero entries: {np.count_nonzero(sample_vector)}")

# ─── 4. Export to ONNX ────────────────────────────────────────────────────────
print("Exporting to ONNX...")

# Input: one string document (shape [None, 1] — batch of 1-element string arrays)
initial_type = [("input", StringTensorType([None, 1]))]

onnx_model = convert_sklearn(
    vectorizer,
    name="TFIDFVectorizer",
    initial_types=initial_type,
    target_opset=17,          # ONNX opset — 17 is stable and widely supported
)

# ─── 5. Save the model ────────────────────────────────────────────────────────
os.makedirs("models", exist_ok=True)
model_path = os.path.join("models", "tfidf.onnx")

with open(model_path, "wb") as f:
    f.write(onnx_model.SerializeToString())

model_size_kb = os.path.getsize(model_path) / 1024
print(f"  Model saved: {model_path}")
print(f"  Model size: {model_size_kb:.1f} KB")

# ─── 6. Print ONNX I/O names (copy these into .NET) ──────────────────────────
import onnxruntime as rt
sess = rt.InferenceSession(model_path)

input_name  = sess.get_inputs()[0].name
output_name = sess.get_outputs()[0].name

print(f"\n📋 ONNX I/O names for .NET:")
print(f"  Input  name: '{input_name}'")
print(f"  Output name: '{output_name}'")
print(f"  Input  shape: {sess.get_inputs()[0].shape}")
print(f"  Output shape: {sess.get_outputs()[0].shape}")
print("\n✅ Training complete.")
```

### Step 3.2 — Run the training script
```powershell
# Make sure you're in ml/ with the venv activated
python train_tfidf.py
```

**Expected output**:
```
Loading corpus...
  Loaded 5000 documents
Fitting TfidfVectorizer...
  Vocabulary size: 5000
  Sample vocab: ['python', 'developer', ...]
  Sample vector shape: (1, 5000)
  Non-zero entries: 12
Exporting to ONNX...
  Model saved: models/tfidf.onnx
  Model size: ~1800.0 KB

📋 ONNX I/O names for .NET:
  Input  name: 'input'
  Output name: 'variable'
  Input  shape: [None, 1]
  Output shape: [None, 5000]

✅ Training complete.
```

> [!IMPORTANT]
> **Copy the input/output names printed here.** You will use them in the C# `OnnxInferenceService` in Phase 2. They are almost always `'input'` and `'variable'` but can vary.

**✅ M3 Checkpoint**: `ml/models/tfidf.onnx` file exists and is >500 KB.

---

## M4 — Verify ONNX Model in Python *(~30 min)*

### Step 4.1 — Create `ml/verify_model.py`

Create this file at `h:\CV Screener .net + next.js\ml\verify_model.py`:

```python
"""
verify_model.py
Loads tfidf.onnx and runs 3 sanity checks:
  1. Similar texts score > 0.7  (same domain)
  2. Unrelated texts score < 0.1 (different domain)
  3. Identical texts score ≈ 1.0
"""

import numpy as np
import onnxruntime as rt

MODEL_PATH = "models/tfidf.onnx"

# ─── Load model ───────────────────────────────────────────────────────────────
sess = rt.InferenceSession(MODEL_PATH)
INPUT_NAME  = sess.get_inputs()[0].name
OUTPUT_NAME = sess.get_outputs()[0].name

def vectorize(text: str) -> np.ndarray:
    """Run ONNX inference on a single text string. Returns float array of shape (5000,)."""
    inp = np.array([[text]])   # shape (1, 1), dtype str
    result = sess.run([OUTPUT_NAME], {INPUT_NAME: inp})
    return result[0][0]       # shape (5000,)

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two vectors. Matches the C# implementation."""
    mag_a = np.linalg.norm(a)
    mag_b = np.linalg.norm(b)
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return float(np.dot(a, b) / (mag_a * mag_b))

# ─── Test 1: Similar domain (tech JD vs tech CV) ──────────────────────────────
cv_tech  = "python developer with django rest api postgresql docker experience"
jd_tech  = "python engineer flask backend api postgresql cloud deployment"

v_cv   = vectorize(cv_tech)
v_jd   = vectorize(jd_tech)
score1 = cosine_similarity(v_cv, v_jd)

print(f"Test 1 — Similar  (tech JD ↔ tech CV): {score1:.4f}", "✅" if score1 > 0.7 else "❌ EXPECTED > 0.7")

# ─── Test 2: Unrelated domain (cooking vs tech) ───────────────────────────────
cv_chef  = "chef cook restaurant kitchen pastry grilling food preparation culinary"
score2   = cosine_similarity(v_jd, vectorize(cv_chef))

print(f"Test 2 — Unrelated (tech JD ↔ chef CV): {score2:.4f}", "✅" if score2 < 0.1 else "❌ EXPECTED < 0.1")

# ─── Test 3: Identical text scores ≈ 1.0 ────────────────────────────────────
identical = "software engineer python java spring cloud aws kubernetes"
score3    = cosine_similarity(vectorize(identical), vectorize(identical))

print(f"Test 3 — Identical text:                 {score3:.4f}", "✅" if score3 > 0.99 else "❌ EXPECTED ≈ 1.0")

# ─── Test 4: Edge case — empty-ish text ──────────────────────────────────────
empty_vec = vectorize("the and or a")   # all stop words
score4    = cosine_similarity(v_jd, empty_vec)
print(f"Test 4 — All stop words vs JD:           {score4:.4f} (should be near 0)")

print("\n📊 Verification complete.")
```

### Step 4.2 — Run verification
```powershell
python verify_model.py
```

**Expected output**:
```
Test 1 — Similar  (tech JD ↔ tech CV): 0.7xxx ✅
Test 2 — Unrelated (tech JD ↔ chef CV): 0.0xxx ✅
Test 3 — Identical text:                 1.0000 ✅
Test 4 — All stop words vs JD:           0.0000 (should be near 0)

📊 Verification complete.
```

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Test 1 score < 0.5 | Corpus too small or wrong domain | Use 500+ tech JDs; re-run training |
| Test 2 score > 0.2 | Stop words not removed | Verify `stop_words="english"` in vectorizer |
| ONNX load error | Wrong opset | Try `target_opset=15` in `convert_sklearn` |
| Shape mismatch | Input tensor wrong | Ensure `inp = np.array([[text]])` shape is `(1,1)` |

**✅ M4 Checkpoint**: All 3 main tests print ✅.

---

## M5 — Wire ONNX into .NET: OnnxInferenceService Stub *(~2 h)*

> [!NOTE]
> This is a **stub** — just enough to prove the .NET integration works. Full `MatchingService` orchestration is Phase 2. The goal here is to validate that C# can load and call the ONNX model correctly.

### Step 5.1 — Add NuGet package to Infrastructure project

Open a terminal in the backend:
```powershell
cd "h:\CV Screener .net + next.js\backend\src\CVScreener.Infrastructure"
dotnet add package Microsoft.ML.OnnxRuntime --version 1.18.0
```

This adds to [CVScreener.Infrastructure.csproj](file:///h:/CV%20Screener%20.net%20+%20next.js/backend/src/CVScreener.Infrastructure/CVScreener.Infrastructure.csproj):
```xml
<PackageReference Include="Microsoft.ML.OnnxRuntime" Version="1.18.0" />
```

Verify it was added:
```powershell
dotnet restore
# Should complete without errors
```

---

### Step 5.2 — Add ML config to `appsettings.json`

Edit [appsettings.json](file:///h:/CV%20Screener%20.net%20+%20next.js/backend/src/CVScreener.API/appsettings.json) — add the `"ML"` section:

```json
{
  "Logging": { ... },
  "AllowedHosts": "*",
  "AllowedOrigins": [ ... ],
  "ConnectionStrings": { ... },
  "Clerk": { ... },

  "ML": {
    "ModelPath": "..\\..\\..\\..\\ml\\models\\tfidf.onnx"
  }
}
```

> [!NOTE]
> The relative path `..\..\..\..\ml\models\tfidf.onnx` goes up from `CVScreener.API/bin/Debug/net8.0/` to the project root, then into `ml/models/`. This works for local `dotnet run`. For Railway deployment, this will be set as an absolute environment variable `ML__ModelPath=/app/ml/models/tfidf.onnx`.

Also add to [.env](file:///h:/CV%20Screener%20.net%20+%20next.js/backend/src/CVScreener.API/.env):
```
ML__ModelPath=../../../../ml/models/tfidf.onnx
```

---

### Step 5.3 — Create the `MlOptions` config model

Create file: `h:\CV Screener .net + next.js\backend\src\CVScreener.Core\Models\MlOptions.cs`

```csharp
namespace CVScreener.Core.Models;

/// <summary>
/// Strongly-typed configuration for ML model settings.
/// Bound from the "ML" section in appsettings.json or environment variable ML__ModelPath.
/// </summary>
public class MlOptions
{
    public const string SectionName = "ML";

    /// <summary>
    /// Absolute or relative path to the tfidf.onnx model file.
    /// Relative paths are resolved from the application's working directory.
    /// </summary>
    public string ModelPath { get; set; } = string.Empty;
}
```

---

### Step 5.4 — Create the `IOnnxInferenceService` interface

Create file: `h:\CV Screener .net + next.js\backend\src\CVScreener.Core\Interfaces\IOnnxInferenceService.cs`

```csharp
namespace CVScreener.Core.Interfaces;

/// <summary>
/// Vectorizes cleaned text using the pre-trained TF-IDF ONNX model.
/// The resulting float array can be used to compute cosine similarity.
/// 
/// Lifetime: Singleton — the InferenceSession is expensive to create and
/// is thread-safe for concurrent Run() calls.
/// </summary>
public interface IOnnxInferenceService
{
    /// <summary>
    /// Converts cleaned text into a TF-IDF vector.
    /// </summary>
    /// <param name="cleanedText">Text pre-processed by TextCleaner.Clean().</param>
    /// <returns>Float array of length 5000 (one value per vocabulary term).</returns>
    Task<float[]> VectorizeAsync(string cleanedText);
}
```

---

### Step 5.5 — Implement `OnnxInferenceService`

Create file: `h:\CV Screener .net + next.js\backend\src\CVScreener.Infrastructure\Services\OnnxInferenceService.cs`

```csharp
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace CVScreener.Infrastructure.Services;

/// <summary>
/// Loads the TF-IDF ONNX model once at startup (Singleton lifetime).
/// Converts text strings into 5000-dimensional float vectors.
/// Thread-safe: InferenceSession.Run() is concurrent-safe per ONNX Runtime docs.
/// </summary>
public sealed class OnnxInferenceService : IOnnxInferenceService, IDisposable
{
    // ── ONNX I/O names ──────────────────────────────────────────────────────
    // These are determined by skl2onnx at export time.
    // Verify with: sess.get_inputs()[0].name in verify_model.py
    private const string InputName  = "input";
    private const string OutputName = "variable";

    private readonly InferenceSession _session;
    private readonly ILogger<OnnxInferenceService> _logger;

    public OnnxInferenceService(
        IOptions<MlOptions> options,
        ILogger<OnnxInferenceService> logger)
    {
        _logger = logger;

        var modelPath = options.Value.ModelPath;

        // Resolve relative paths from the app's working directory
        if (!Path.IsPathRooted(modelPath))
            modelPath = Path.GetFullPath(modelPath, Directory.GetCurrentDirectory());

        if (!File.Exists(modelPath))
            throw new FileNotFoundException(
                $"ONNX model not found at '{modelPath}'. " +
                "Run ml/train_tfidf.py to generate it first.",
                modelPath);

        _logger.LogInformation("Loading ONNX model from: {ModelPath}", modelPath);
        _session = new InferenceSession(modelPath);
        _logger.LogInformation("ONNX model loaded successfully.");
    }

    /// <inheritdoc />
    public Task<float[]> VectorizeAsync(string cleanedText)
    {
        // Input tensor: shape [1, 1], type string
        // skl2onnx expects a 2D string array even for a single document
        var inputData = new string[1, 1] { { cleanedText } };
        var tensor    = new DenseTensor<string>(inputData, new[] { 1, 1 });

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor(InputName, tensor)
        };

        using var results       = _session.Run(inputs);
        var       outputTensor  = results.First().AsTensor<float>();
        float[]   vector        = outputTensor.ToArray();  // length = 5000

        return Task.FromResult(vector);
    }

    /// <summary>
    /// Computes cosine similarity between two TF-IDF vectors.
    /// Range: 0.0 (completely unrelated) to 1.0 (identical direction).
    /// </summary>
    /// <param name="a">Vector A (from CV text).</param>
    /// <param name="b">Vector B (from JD text).</param>
    public static double CosineSimilarity(float[] a, float[] b)
    {
        double dot = 0, magA = 0, magB = 0;

        for (int i = 0; i < a.Length; i++)
        {
            dot  += a[i] * b[i];
            magA += a[i] * (double)a[i];
            magB += b[i] * (double)b[i];
        }

        if (magA == 0 || magB == 0) return 0.0;

        return dot / (Math.Sqrt(magA) * Math.Sqrt(magB));
    }

    public void Dispose() => _session.Dispose();
}
```

---

### Step 5.6 — Register in `Program.cs`

Edit [Program.cs](file:///h:/CV%20Screener%20.net%20+%20next.js/backend/src/CVScreener.API/Program.cs) — add before `builder.Build()`:

```csharp
// ML options — binds "ML" section from appsettings.json / environment
builder.Services.Configure<MlOptions>(
    builder.Configuration.GetSection(MlOptions.SectionName));

// ONNX Inference — Singleton (expensive session, thread-safe)
builder.Services.AddSingleton<IOnnxInferenceService, OnnxInferenceService>();
```

Also add the using at the top of the file (if file-scoped usings are used):
```csharp
using CVScreener.Core.Models;
```

---

### Step 5.7 — Create a smoke-test endpoint (temporary)

This is a **temporary** controller to test end-to-end without Postman JWT setup. **Delete it before Phase 3.**

Create file: `h:\CV Screener .net + next.js\backend\src\CVScreener.API\Controllers\MlTestController.cs`

```csharp
using CVScreener.Core;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

/// <summary>
/// TEMPORARY — Phase 1 smoke test only. DELETE before Phase 3.
/// Tests that ONNX model loads correctly and produces valid similarity scores.
/// No auth required (for quick local testing).
/// </summary>
[ApiController]
[Route("api/ml-test")]
public class MlTestController : ControllerBase
{
    private readonly IOnnxInferenceService _onnx;

    public MlTestController(IOnnxInferenceService onnx)
        => _onnx = onnx;

    /// <summary>
    /// POST /api/ml-test
    /// Body: { "cvText": "...", "jdText": "..." }
    /// Returns cosine similarity between the two texts.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Test([FromBody] MlTestRequest req)
    {
        var cvCleaned = TextCleaner.Clean(req.CvText);
        var jdCleaned = TextCleaner.Clean(req.JdText);

        var cvVector = await _onnx.VectorizeAsync(cvCleaned);
        var jdVector = await _onnx.VectorizeAsync(jdCleaned);

        var similarity = OnnxInferenceService.CosineSimilarity(cvVector, jdVector);

        return Ok(new
        {
            textSimilarity = Math.Round(similarity, 4),
            cvWordCount    = TextCleaner.CountWords(cvCleaned),
            jdWordCount    = TextCleaner.CountWords(jdCleaned),
            vectorDimension = cvVector.Length
        });
    }
}

public record MlTestRequest(string CvText, string JdText);
```

---

### Step 5.8 — Build and run

```powershell
cd "h:\CV Screener .net + next.js\backend\src\CVScreener.API"
dotnet build
# Expected: Build succeeded.

dotnet run
# Expected: Listening on http://localhost:5000 (or 7000)
# Look for: "ONNX model loaded successfully." in logs
```

---

### Step 5.9 — Test the endpoint

Use any HTTP client (curl, Postman, browser REST client, or the `.http` file):

```http
POST http://localhost:5000/api/ml-test
Content-Type: application/json

{
  "cvText": "Python developer with Django REST API PostgreSQL Docker experience five years",
  "jdText": "Python engineer Flask backend API PostgreSQL cloud deployment AWS experience"
}
```

**Expected response**:
```json
{
  "textSimilarity": 0.7342,
  "cvWordCount": 11,
  "jdWordCount": 10,
  "vectorDimension": 5000
}
```

Test with unrelated text:
```http
POST http://localhost:5000/api/ml-test
Content-Type: application/json

{
  "cvText": "chef cook restaurant kitchen pastry grilling food preparation culinary arts",
  "jdText": "Python engineer Flask backend API PostgreSQL cloud deployment AWS experience"
}
```

**Expected**: `textSimilarity` < 0.1

**✅ M5 Checkpoint**: API returns `vectorDimension: 5000` and similarity scores make sense.

---

## Phase 1 Completion Checklist

- [ ] Python venv activated, all packages installed without errors
- [ ] `ml/corpus.json` exists with 100+ documents (500+ preferred)
- [ ] `ml/train_tfidf.py` runs without errors
- [ ] `ml/models/tfidf.onnx` exists, is >500 KB
- [ ] `ml/verify_model.py` passes all 3 tests (✅✅✅)
- [ ] ONNX I/O names recorded (e.g., `input` / `variable`)
- [ ] `Microsoft.ML.OnnxRuntime` NuGet installed in Infrastructure
- [ ] `MlOptions.cs` created in `Core/Models/`
- [ ] `IOnnxInferenceService.cs` created in `Core/Interfaces/`
- [ ] `OnnxInferenceService.cs` created in `Infrastructure/Services/`
- [ ] `MlOptions` + `OnnxInferenceService` registered in `Program.cs`
- [ ] `dotnet build` succeeds with 0 errors
- [ ] `POST /api/ml-test` returns sensible similarity scores
- [ ] **Delete** `MlTestController.cs` before starting Phase 2 API work

---

## Files Created in Phase 1

| File | Status | Purpose |
|------|--------|---------|
| `ml/prepare_corpus.py` | 🆕 NEW | Downloads & cleans Kaggle corpus |
| `ml/corpus.json` | 🆕 NEW | Training data for vectorizer |
| `ml/train_tfidf.py` | 🆕 NEW | Trains & exports ONNX model |
| `ml/models/tfidf.onnx` | 🆕 NEW | Trained model artifact |
| `ml/verify_model.py` | 🆕 NEW | Python accuracy tests |
| `Core/Models/MlOptions.cs` | 🆕 NEW | Config binding class |
| `Core/Interfaces/IOnnxInferenceService.cs` | 🆕 NEW | Interface (Clean Arch contract) |
| `Infrastructure/Services/OnnxInferenceService.cs` | 🆕 NEW | ONNX runtime wrapper |
| `API/Controllers/MlTestController.cs` | 🆕 TEMP | Smoke test — delete before Phase 3 |
| `appsettings.json` | ✏️ MODIFY | Add `"ML": { "ModelPath": "..." }` |
| `Program.cs` | ✏️ MODIFY | Register `MlOptions` + `OnnxInferenceService` |

---

## Common Pitfalls

> [!WARNING]
> **ONNX input name mismatch** — the most common Phase 2 bug. The constant `InputName = "input"` in `OnnxInferenceService.cs` MUST match exactly what `train_tfidf.py` prints. Copy it character-for-character from the training output.

> [!WARNING]
> **Model path at runtime** — `dotnet run` CWD is `CVScreener.API/` but the compiled binary runs from `bin/Debug/net8.0/`. The path resolution in `OnnxInferenceService` handles this, but if you see `FileNotFoundException`, check what `Directory.GetCurrentDirectory()` returns in the logs.

> [!CAUTION]
> **Do NOT commit `tfidf.onnx` to git** (per Open Decision #5). Add `ml/models/*.onnx` to `.gitignore`. The model file will be ~1.8 MB and belongs in Railway's persistent volume or as a build artifact.

---

## What Phase 2 Builds On Top Of

Phase 2 will inject `IOnnxInferenceService` into `MatchingService` (via constructor injection) and call:
```csharp
var cvVector = await _onnx.VectorizeAsync(TextCleaner.Clean(cvText));
var jdVector = await _onnx.VectorizeAsync(TextCleaner.Clean(jdText));
var textSimilarity = OnnxInferenceService.CosineSimilarity(cvVector, jdVector);
// textSimilarity contributes 50% to the final score
```
