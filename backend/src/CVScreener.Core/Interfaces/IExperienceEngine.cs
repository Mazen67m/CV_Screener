using CVScreener.Core.Models;

namespace CVScreener.Core.Interfaces;

/// <summary>
/// Extracts years of experience from CV and JD texts and produces a 0–1 score.
///
/// Strategy:
///   1. Use regex to find explicit numeric mentions ("5 years", "10+ years experience")
///   2. Fall back to seniority keywords when no number is found
///      (junior=1, mid=3, senior=5, lead=7, principal=9)
///   3. If neither text gives any signal → return Score = 0.5 (neutral)
///
/// Lifetime: Scoped — stateless, no shared mutable state.
/// </summary>
public interface IExperienceEngine
{
    /// <summary>
    /// Analyzes experience signals in both texts and returns a normalised score.
    /// </summary>
    /// <param name="cleanedCv">CV text pre-processed by TextCleaner.Clean().</param>
    /// <param name="cleanedJd">JD text pre-processed by TextCleaner.Clean().</param>
    ExperienceResult Analyze(string cleanedCv, string cleanedJd);
}
