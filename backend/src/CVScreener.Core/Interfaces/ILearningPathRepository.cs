namespace CVScreener.Core.Interfaces;

/// <summary>
/// Returns missing skills for a specific analysis, ordered by frequency
/// across all of the user's analyses (most commonly missing first).
/// </summary>
public interface ILearningPathRepository
{
    /// <summary>
    /// Fetches the missing skills for <paramref name="analysisId"/>,
    /// sorted by how frequently each skill appears in the user's missing_skills
    /// column across all their analyses. Ownership is enforced via clerkId.
    /// Returns an empty list if the analysis is not found or belongs to another user.
    /// </summary>
    Task<IReadOnlyList<string>> GetSortedMissingSkillsAsync(
        Guid analysisId,
        string clerkId,
        CancellationToken ct = default);
}
