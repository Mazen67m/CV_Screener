namespace CVScreener.API.DTOs.Analysis;

/// <summary>
/// Response body for GET /api/analysis/{id}.
/// Contains the full scoring breakdown and raw texts.
/// </summary>
public class AnalyzeResponse
{
    /// <summary>Database GUID for this analysis row.</summary>
    public Guid Id { get; set; }

    /// <summary>Optional role label provided by the caller at submission time.</summary>
    public string? JobTitle { get; set; }

    /// <summary>
    /// Final weighted score on a 0–100 integer scale.
    /// Formula: Round((0.50 × TextSimilarity + 0.35 × SkillsScore + 0.15 × ExperienceScore) × 100)
    /// </summary>
    public int OverallScore { get; set; }

    /// <summary>
    /// Human-readable score label (DEC-018 / F-07 spec).
    /// Values: "Poor Match" | "Below Average" | "Average Match" | "Good Match" | "Excellent Match"
    /// </summary>
    public string ScoreLabel { get; set; } = string.Empty;

    /// <summary>Raw TF-IDF cosine similarity between CV and JD vectors. Range: [0, 1].</summary>
    public double TextSimilarity { get; set; }

    /// <summary>Normalised skills match score. Range: [0, 1].</summary>
    public double SkillsScore { get; set; }

    /// <summary>Normalised experience match score. Range: [0, 1].</summary>
    public double ExperienceScore { get; set; }

    /// <summary>Raw CV text as submitted (un-cleaned). Included per D-05.</summary>
    public string CvText { get; set; } = string.Empty;

    /// <summary>Raw JD text as submitted (un-cleaned). Included per D-05.</summary>
    public string JdText { get; set; } = string.Empty;

    /// <summary>Detailed skills breakdown.</summary>
    public SkillBreakdownDto Skills { get; set; } = new();

    /// <summary>Detailed experience breakdown.</summary>
    public ExperienceBreakdownDto Experience { get; set; } = new();

    /// <summary>UTC timestamp when this analysis was first created.</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response body for POST /api/analysis/analyze.
/// Adds cache status, which is meaningful only during live analysis requests.
/// </summary>
public sealed class AnalyzeCreatedResponse : AnalyzeResponse
{
    /// <summary>
    /// True when this result came from the dedup cache (identical CV+JD already analyzed).
    /// False when freshly computed.
    /// </summary>
    public bool IsFromCache { get; set; }
}

/// <summary>Skills match breakdown returned inside AnalyzeResponse.</summary>
public class SkillBreakdownDto
{
    /// <summary>Skills found in both CV and JD (canonical match).</summary>
    public string[] Matched { get; set; } = [];

    /// <summary>Skills found via alias in CV but not the canonical term in JD (partial match, half score).</summary>
    public string[] Partial { get; set; } = [];

    /// <summary>Skills required by JD but absent from CV.</summary>
    public string[] Missing { get; set; } = [];
}

/// <summary>Experience breakdown returned inside AnalyzeResponse.</summary>
public class ExperienceBreakdownDto
{
    /// <summary>Years of experience detected in the CV (0 if none found).</summary>
    public double CvYears { get; set; }

    /// <summary>Years of experience required by the JD (0 if none found).</summary>
    public double RequiredYears { get; set; }

    /// <summary>Normalised experience score. Range: [0, 1]. 0.5 = neutral (no data).</summary>
    public double Score { get; set; }

    /// <summary>
    /// Optional human-readable note about an experience gap.
    /// Example: "Role requires 5+ years of experience (CV indicates ~2 years)."
    /// Null when no significant gap is detected.
    /// </summary>
    public string? MismatchNote { get; set; }
}
