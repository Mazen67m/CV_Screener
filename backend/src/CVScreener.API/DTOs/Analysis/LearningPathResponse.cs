namespace CVScreener.API.DTOs.Analysis;

/// <summary>
/// Response body for GET /api/analysis/{id}/learning-path.
/// Contains the analysis's missing skills sorted by frequency across all of the
/// user's analyses (most commonly missing first).
/// </summary>
public class LearningPathResponse
{
    /// <summary>
    /// Missing skills ordered by cross-analysis frequency (most recurring first).
    /// Empty list when the analysis has no missing skills or is not found.
    /// </summary>
    public IReadOnlyList<string> Skills { get; set; } = [];
}
