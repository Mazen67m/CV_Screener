namespace CVScreener.Core.Models;

/// <summary>
/// Strongly-typed configuration for ML model settings.
/// Bound from the "ML" section in appsettings.json or environment variables
/// (ML__ModelPath, ML__VocabularyPath, ML__IdfWeightsPath).
/// </summary>
public class MlOptions
{
    public const string SectionName = "ML";

    /// <summary>Path to tfidf.onnx — used by OnnxInferenceService (primary).</summary>
    public string ModelPath { get; set; } = string.Empty;

    /// <summary>Path to vocabulary.json (word → column index map) — used by TfIdfService (fallback).</summary>
    public string VocabularyPath { get; set; } = string.Empty;

    /// <summary>Path to idf_weights.json (IDF weight per vocabulary term) — used by TfIdfService (fallback).</summary>
    public string IdfWeightsPath { get; set; } = string.Empty;
}
