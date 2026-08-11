namespace CVScreener.Core;

/// <summary>
/// Centralised limits and thresholds for the CV Screener application.
/// Reference these constants everywhere — never hardcode the raw values.
/// </summary>
public static class AppLimits
{
    // ─── CV ──────────────────────────────────────────────────────────────────

    /// <summary>Maximum accepted CV file size: 5 MB.</summary>
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;

    /// <summary>Minimum word count for a CV to be considered valid.</summary>
    public const int MinWordCount = 50;

    // ─── Job Description ─────────────────────────────────────────────────────

    /// <summary>Minimum word count for a JD (post-cleaning).</summary>
    public const int JdMinWordCount = 50;

    /// <summary>Maximum word count for a JD (post-cleaning).</summary>
    public const int JdMaxWordCount = 5000;

    // ─── Analysis History ───────────────────────────────────────────────────

    /// <summary>Maximum number of history items returned by GET /api/analysis/history.</summary>
    public const int HistoryLimit = 50;
}
