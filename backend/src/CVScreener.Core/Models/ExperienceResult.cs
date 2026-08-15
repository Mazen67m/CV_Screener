namespace CVScreener.Core.Models;

/// <summary>
/// Output of IExperienceEngine.Analyze().
/// Captures extracted year values, whether fallback heuristics were used,
/// and the final normalised score.
/// </summary>
public class ExperienceResult
{
    /// <summary>Years of experience found in the CV (0 if none detected).</summary>
    public double CvYears { get; set; }

    /// <summary>Years of experience required by the JD (0 if none detected).</summary>
    public double RequiredYears { get; set; }

    /// <summary>
    /// True when CvYears was derived from a seniority keyword (junior/senior/etc.)
    /// rather than an explicit numeric mention.
    /// </summary>
    public bool CvYearsFromFallback { get; set; }

    /// <summary>
    /// True when RequiredYears was derived from a seniority keyword
    /// rather than an explicit numeric mention.
    /// </summary>
    public bool RequiredYearsFromFallback { get; set; }

    /// <summary>
    /// Normalised score in [0, 1].
    /// Formula: Min(CvYears / Max(RequiredYears, 1), 1.0)
    /// Returns 0.5 when neither text mentions years or seniority (neutral, non-penalising).
    /// </summary>
    public double Score { get; set; }

    /// <summary>
    /// Optional human-readable note describing a detected experience gap.
    /// Examples: "Role requires 5+ years of experience" or "Role targets a Senior level."
    /// Null when no meaningful gap is detected.
    /// </summary>
    public string? MismatchNote { get; set; }
}
