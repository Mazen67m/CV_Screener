namespace CVScreener.Core.Models;

/// <summary>
/// Lightweight analysis summary used by history listings.
/// </summary>
public class AnalysisHistoryItem
{
    public Guid Id { get; set; }

    public string? JobTitle { get; set; }

    public int OverallScore { get; set; }

    public int MatchedSkillsCount { get; set; }

    public int MissingSkillsCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
