using System.Text.Json;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CVScreener.Infrastructure.Services;

/// <summary>
/// Loads vocabulary.json + idf_weights.json once at startup (Singleton),
/// then transforms any cleaned text string into a TF-IDF vector using the
/// same algorithm as Python's TfidfVectorizer(sublinear_tf=True, ngram_range=(1,2)).
///
/// Thread-safe: all fields are read-only after construction.
/// </summary>
public sealed class TfIdfService : IOnnxInferenceService, ITfIdfService
{
    // ── Loaded model data ────────────────────────────────────────────────────
    private readonly Dictionary<string, int> _vocabulary;   // word  → column index
    private readonly float[]                 _idfWeights;   // index → IDF weight
    private readonly int                     _vocabSize;

    private readonly ILogger<TfIdfService> _logger;

    public TfIdfService(IOptions<MlOptions> options, ILogger<TfIdfService> logger)
    {
        _logger = logger;

        var opts = options.Value;

        // Resolve relative paths from the app working directory
        var vocabPath  = ResolvePath(opts.VocabularyPath);
        var idfPath    = ResolvePath(opts.IdfWeightsPath);

        ValidateFile(vocabPath, "VocabularyPath");
        ValidateFile(idfPath,   "IdfWeightsPath");

        _logger.LogInformation("Loading TF-IDF model from {VocabPath} and {IdfPath}", vocabPath, idfPath);

        _vocabulary  = JsonSerializer.Deserialize<Dictionary<string, int>>(File.ReadAllText(vocabPath))
                       ?? throw new InvalidOperationException("vocabulary.json is empty or invalid.");

        _idfWeights  = JsonSerializer.Deserialize<float[]>(File.ReadAllText(idfPath))
                       ?? throw new InvalidOperationException("idf_weights.json is empty or invalid.");

        _vocabSize   = _vocabulary.Count;

        _logger.LogInformation("TF-IDF model loaded: {VocabSize} terms.", _vocabSize);
    }

    /// <inheritdoc />
    public float[] Vectorize(string cleanedText)
    {
        if (string.IsNullOrWhiteSpace(cleanedText))
            return new float[_vocabSize];

        var tokens = cleanedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        // ── Count raw term frequencies (unigrams + bigrams) ──────────────────
        var tfCounts    = new Dictionary<string, int>(StringComparer.Ordinal);
        int totalTerms  = 0;

        // Unigrams
        foreach (var token in tokens)
        {
            tfCounts.TryGetValue(token, out int c);
            tfCounts[token] = c + 1;
            totalTerms++;
        }

        // Bigrams  (ngram_range=(1,2))
        for (int i = 0; i < tokens.Length - 1; i++)
        {
            var bigram = string.Concat(tokens[i], " ", tokens[i + 1]);
            tfCounts.TryGetValue(bigram, out int c);
            tfCounts[bigram] = c + 1;
            totalTerms++;
        }

        if (totalTerms == 0)
            return new float[_vocabSize];

        // ── Build TF-IDF vector ──────────────────────────────────────────────
        var vector = new float[_vocabSize];

        foreach (var (term, count) in tfCounts)
        {
            if (!_vocabulary.TryGetValue(term, out int colIdx))
                continue;   // term not in vocabulary — skip

            double rawTf = (double)count / totalTerms;
            double tf    = Math.Log(1.0 + rawTf);   // sublinear_tf = True
            vector[colIdx] = (float)(tf * _idfWeights[colIdx]);
        }

        // ── L2 normalise ─────────────────────────────────────────────────────
        double magnitude = 0;
        foreach (var v in vector) magnitude += v * (double)v;
        magnitude = Math.Sqrt(magnitude);

        if (magnitude > 0)
            for (int i = 0; i < vector.Length; i++)
                vector[i] = (float)(vector[i] / magnitude);

        return vector;
    }

    /// <inheritdoc />
    public double CosineSimilarity(float[] a, float[] b)
    {
        // Both vectors are already L2-normalised → cosine similarity = dot product
        double dot = 0;
        for (int i = 0; i < a.Length; i++)
            dot += a[i] * (double)b[i];

        return Math.Max(0, Math.Min(1, dot));   // clamp to [0, 1]
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string ResolvePath(string path)
        => Path.IsPathRooted(path)
            ? path
            : Path.GetFullPath(path, Directory.GetCurrentDirectory());

    private static void ValidateFile(string path, string settingName)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException(
                $"ML model file not found for setting '{settingName}': '{path}'. " +
                "Run ml/train_tfidf.py to generate the model files.",
                path);
    }
}
