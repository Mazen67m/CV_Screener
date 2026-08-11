namespace CVScreener.Core.Models;

/// <summary>
/// Strongly-typed configuration for SkillsEngine settings.
/// Bound from the "SkillsEngine" section in appsettings.json or environment variables.
/// </summary>
public class SkillsEngineOptions
{
    public const string SectionName = "SkillsEngine";

    /// <summary>
    /// Path to skills_taxonomy.json. Can be relative (resolved from CWD) or absolute.
    /// Default: "ml/skills_taxonomy.json"
    /// </summary>
    public string TaxonomyPath { get; set; } = "ml/skills_taxonomy.json";
}
