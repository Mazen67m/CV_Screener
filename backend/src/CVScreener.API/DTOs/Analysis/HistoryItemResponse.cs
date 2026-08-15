namespace CVScreener.API.DTOs.Analysis;

/// <summary>
/// Summary item returned in GET /api/history.
/// Intentionally lightweight — contains only the fields needed to render
/// the history list in the frontend. The full AnalyzeResponse is fetched
/// lazily via GET /api/analysis/{id} on click (D-13).
/// </summary>
public class HistoryItemResponse
{
    /// <summary>Database GUID — used to fetch the full detail via GET /api/analysis/{id}.</summary>
    public Guid Id { get; set; }

    /// <summary>Optional role label supplied at submission time. Null if not provided.</summary>
    public string? JobTitle { get; set; }

    /// <summary>Final weighted score (0–100 integer).</summary>
    public int OverallScore { get; set; }

    /// <summary>Human-readable score label. See ScoreLabel.FromScore().</summary>
    public string ScoreLabel { get; set; } = string.Empty;

    /// <summary>Number of skills found in both CV and JD (matched + partial).</summary>
    public int MatchedSkillsCount { get; set; }

    /// <summary>Number of skills required by JD but absent from CV.</summary>
    public int MissingSkillsCount { get; set; }

    /// <summary>UTC timestamp when this analysis was first created.</summary>
    public DateTime CreatedAt { get; set; }
}
