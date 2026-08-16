using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;

using CVScreener.Infrastructure.Helpers;

namespace CVScreener.Infrastructure.Services;

/// <summary>
/// Loads tfidf.onnx once at startup and exposes vectorization via ONNX Runtime.
///
/// Model contract (from ml/train_tfidf.py + skl2onnx):
///   Input  : name="input",    type=string, shape=[None, 1]  ← one document per batch element
///   Output : name="variable", type=float,  shape=[None, 5000] ← L2-normalised TF-IDF vector
///
/// Thread-safety: InferenceSession.Run() is thread-safe for concurrent requests.
/// Lifetime: Singleton — session is expensive to create; load once at startup.
/// </summary>
public sealed class OnnxInferenceService : IOnnxInferenceService, IDisposable
{
    private readonly InferenceSession _session;
    private readonly string _inputName;
    private readonly string _outputName;
    private readonly ILogger<OnnxInferenceService> _logger;

    public OnnxInferenceService(IOptions<MlOptions> options, ILogger<OnnxInferenceService> logger)
    {
        _logger = logger;

        var modelPath = ResolvePath(options.Value.ModelPath);
        ValidateFile(modelPath, "ML:ModelPath");

        _logger.LogInformation("Loading ONNX model from {Path}", modelPath);

        _session    = new InferenceSession(modelPath);
        _inputName  = _session.InputMetadata.Keys.First();   // "input"
        _outputName = _session.OutputMetadata.Keys.First();  // "variable"

        var inputShape  = _session.InputMetadata[_inputName].Dimensions;
        var outputShape = _session.OutputMetadata[_outputName].Dimensions;

        _logger.LogInformation(
            "ONNX model loaded. Input='{In}' shape=[{IS}], Output='{Out}' shape=[{OS}]",
            _inputName,  string.Join(",", inputShape),
            _outputName, string.Join(",", outputShape));

        AssertModelOutputsL2Normalised();
    }

    /// <inheritdoc />
    /// <remarks>
    /// Wraps the cleaned text in a [1, 1] string tensor, runs the ONNX session,
    /// and returns the resulting L2-normalised float vector of length 5000.
    /// </remarks>
    public float[] Vectorize(string cleanedText)
    {
        if (string.IsNullOrWhiteSpace(cleanedText))
        {
            _logger.LogDebug("OnnxInferenceService.Vectorize called with empty text — returning zero vector.");
            return new float[_session.OutputMetadata[_outputName].Dimensions[1]];
        }

        // Input tensor: shape [1, 1], type string
        // DenseTensor expects flat Memory<T> — pass a 1-element string[] (not a 2D array)
        var inputData = new string[] { cleanedText };
        var tensor    = new DenseTensor<string>(inputData, new int[] { 1, 1 });

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor(_inputName, tensor)
        };

        using var results      = _session.Run(inputs);
        var       outputTensor = results.First().AsTensor<float>();

        // Flatten [1, 5000] → float[5000]
        return outputTensor.ToArray();
    }

    /// <inheritdoc />
    /// <summary>
    /// Computes cosine similarity for vectors that are already L2-normalised by the ONNX model.
    /// </summary>
    /// <remarks>
    /// Both vectors are L2-normalised by the ONNX model (sklearn normalises TF-IDF output).
    /// Therefore cosine similarity equals the dot product — no magnitude division needed.
    /// Result is clamped to [0, 1] to guard against floating-point rounding.
    /// </remarks>
    public double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length)
            throw new ArgumentException("Vectors must have the same length.");

        double dot = 0;
        for (int i = 0; i < a.Length; i++)
            dot += a[i] * (double)b[i];

        return Math.Max(0, Math.Min(1, dot));
    }

    public void Dispose() => _session.Dispose();

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static string ResolvePath(string path)
        => PathResolver.Resolve(path);

    private static void ValidateFile(string path, string settingKey)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException(
                $"ONNX model file not found for setting '{settingKey}': '{path}'. " +
                "Run ml/train_tfidf.py to generate ml/models/tfidf.onnx.",
                path);
    }

    private void AssertModelOutputsL2Normalised()
    {
        const string probeText = "python developer software engineer database api cloud";
        var vector = Vectorize(probeText);
        var squaredNorm = vector.Sum(value => value * (double)value);

        if (squaredNorm <= 0)
            throw new InvalidOperationException(
                "ONNX model normalization check failed: probe text produced a zero vector. " +
                "Ensure the TF-IDF vocabulary contains common software-engineering terms.");

        if (Math.Abs(squaredNorm - 1.0) > 0.001)
            throw new InvalidOperationException(
                $"ONNX model normalization check failed: expected L2-normalised output with dot(v,v) ~= 1.0, got {squaredNorm:F6}. " +
                "CosineSimilarity assumes normalized vectors and must be updated if the model contract changes.");
    }
}
