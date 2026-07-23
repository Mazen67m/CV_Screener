namespace CVScreener.Core.Entities;

public class Analysis
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string CvText { get; set; } = string.Empty;
    public string JdText { get; set; } = string.Empty;
    public int OverallScore { get; set; }
    public float TextSimilarity { get; set; }
    public float SkillsScore { get; set; }
    public float ExperienceScore { get; set; }
    public string? MatchedSkills { get; set; }   // JSONB stored as string
    public string? PartialSkills { get; set; }
    public string? MissingSkills { get; set; }
    public string? ExperienceData { get; set; }
    public string AnalysisVersion { get; set; } = "v2";
    public DateTime CreatedAt { get; set; }
}
