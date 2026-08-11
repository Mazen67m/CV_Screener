namespace CVScreener.Core.Interfaces;

/// <summary>
/// Converts cleaned text into a TF-IDF vector and computes cosine similarity.
///
/// Lifetime: Singleton — vocabulary and IDF weights are loaded once at startup
/// and are read-only thereafter (fully thread-safe).
/// </summary>
public interface ITfIdfService
{
    /// <summary>
    /// Converts cleaned text into a normalised TF-IDF float vector.
    /// The vector length equals the vocabulary size (5000).
    /// </summary>
    /// <param name="cleanedText">Text pre-processed by TextCleaner.Clean().</param>
    /// <returns>L2-normalised float array of length VocabularySize.</returns>
    float[] Vectorize(string cleanedText);

    /// <summary>
    /// Computes cosine similarity between two TF-IDF vectors.
    /// Because both vectors are L2-normalised, this equals their dot product.
    /// </summary>
    /// <returns>Value in [0, 1]. 1 = identical direction, 0 = unrelated.</returns>
    double CosineSimilarity(float[] a, float[] b);
}
