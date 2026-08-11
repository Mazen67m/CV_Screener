using CVScreener.Core.Models;

namespace CVScreener.Core.Interfaces;

/// <summary>
/// Orchestrates all three scoring engines (TF-IDF, Skills, Experience),
/// persists results to the analyses table, and implements MD5-based upsert
/// deduplication so identical CV+JD pairs are never re-computed.
///
/// Lifetime: Scoped — depends on IAuthService which is also Scoped.
/// </summary>
public interface IMatchingService
{
    /// <summary>
    /// Runs the full hybrid scoring pipeline on raw (un-cleaned) CV and JD text.
    /// TextCleaner.Clean() is applied internally before any ML/matching call.
    ///
    /// On a hash match (same userId + cvText + jdText already in DB):
    ///   → returns the existing AnalysisResult with IsFromCache = true.
    /// On a cache miss:
    ///   → computes all three signals, persists to DB, returns IsFromCache = false.
    /// </summary>
    /// <param name="clerkId">Clerk user ID extracted from the JWT by the controller.</param>
    /// <param name="rawCvText">Extracted CV text from CvExtractionService.</param>
    /// <param name="rawJdText">Validated JD text from JdValidationService.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<AnalysisResult> AnalyzeAsync(
        string clerkId,
        string rawCvText,
        string rawJdText,
        string? jobTitle = null,                 // D-11: optional, max 200 chars (validated by caller)
        CancellationToken cancellationToken = default);
}
