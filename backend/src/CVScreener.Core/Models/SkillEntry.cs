namespace CVScreener.Core.Models;

/// <summary>
/// Represents one entry in skills_taxonomy.json.
/// </summary>
public class SkillEntry
{
    /// <summary>The primary, display-ready name (e.g., "Python", "Kubernetes").</summary>
    public string Canonical { get; set; } = string.Empty;

    /// <summary>
    /// Alternative spellings or abbreviations that map to this canonical skill
    /// (e.g., "k8s" maps to "Kubernetes").
    /// </summary>
    public List<string> Aliases { get; set; } = [];
}
