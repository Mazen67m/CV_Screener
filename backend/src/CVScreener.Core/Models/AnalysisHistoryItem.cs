namespace CVScreener.Core.Models;

/// <summary>
/// Lightweight analysis summary used by history listings.
/// </summary>
public class AnalysisHistoryItem
{
    public Guid Id { get; set; }

    public string? JobTitle { get; set; }

    public int OverallScore { get; set; }

    /// <summary>Human-readable score label. See ScoreLabel.FromScore().</summary>
    public string ScoreLabel { get; set; } = string.Empty;

    public int MatchedSkillsCount { get; set; }

    public int MissingSkillsCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
