using CVScreener.Core.Models;

namespace CVScreener.Core.Interfaces;

/// <summary>
/// Loads skills_taxonomy.json and classifies required JD skills against a CV.
///
/// Lifetime: Singleton — the taxonomy is loaded once at startup and is read-only.
/// All comparisons are case-insensitive; input texts must already be cleaned
/// by TextCleaner.Clean() before being passed here.
/// </summary>
public interface ISkillsEngine
{
    /// <summary>
    /// Extracts all skills required by the JD, then classifies each as
    /// Matched / Partial / Missing against the CV.
    /// </summary>
    /// <param name="cleanedCv">CV text pre-processed by TextCleaner.Clean().</param>
    /// <param name="cleanedJd">JD text pre-processed by TextCleaner.Clean().</param>
    /// <returns>
    /// A <see cref="SkillsResult"/> with three lists and a normalised score in [0, 1].
    /// </returns>
    SkillsResult Analyze(string cleanedCv, string cleanedJd);
}
