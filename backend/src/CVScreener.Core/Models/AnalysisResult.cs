namespace CVScreener.Core.Models;

/// <summary>
/// Full result returned by IMatchingService.AnalyzeAsync().
/// Contains the computed score, all three signal breakdowns, and cache status.
/// </summary>
public class AnalysisResult
{
    /// <summary>Database row ID (GUID). Useful for linking to history.</summary>
    public Guid Id { get; set; }

    /// <summary>Optional job title label supplied by the caller. Stored for display in history.</summary>
    public string? JobTitle { get; set; }

    /// <summary>Raw CV text as submitted (un-cleaned). Returned in AnalyzeResponse per D-05.</summary>
    public string CvText { get; set; } = string.Empty;

    /// <summary>Raw JD text as submitted (un-cleaned). Returned in AnalyzeResponse per D-05.</summary>
    public string JdText { get; set; } = string.Empty;

    /// <summary>
    /// Final weighted score on a 0–100 integer scale.
    /// Formula: Round((0.50 × TextSimilarity + 0.35 × SkillsScore + 0.15 × ExperienceScore) × 100)
    /// </summary>
    public int OverallScore { get; set; }

    /// <summary>Raw TF-IDF cosine similarity between CV and JD vectors. Range: [0, 1].</summary>
    public double TextSimilarity { get; set; }

    /// <summary>
    /// Normalised skills match score. Range: [0, 1].
    /// Derived from SkillsResult.Score.
    /// </summary>
    public double SkillsScore { get; set; }

    /// <summary>
    /// Normalised experience match score. Range: [0, 1].
    /// Derived from ExperienceResult.Score.
    /// </summary>
    public double ExperienceScore { get; set; }

    /// <summary>Full skills breakdown (Matched / Partial / Missing arrays).</summary>
    public SkillsResult Skills { get; set; } = new();

    /// <summary>Full experience breakdown (CvYears, RequiredYears, Score).</summary>
    public ExperienceResult Experience { get; set; } = new();

    /// <summary>
    /// True when this result was retrieved from an existing DB row (MD5 hash match)
    /// rather than freshly computed. The frontend can use this to display a "Cached" badge.
    /// </summary>
    public bool IsFromCache { get; set; }

    /// <summary>Timestamp when this analysis was first created.</summary>
    public DateTime CreatedAt { get; set; }
}
