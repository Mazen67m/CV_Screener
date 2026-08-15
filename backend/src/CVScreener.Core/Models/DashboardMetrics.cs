namespace CVScreener.Core.Models;

/// <summary>
/// Aggregated dashboard metrics for the authenticated user.
/// Computed via SQL aggregation in IDashboardRepository.
/// </summary>
public record DashboardMetrics(
    int TotalAnalyses,
    int? AverageScore,
    int? BestScore,
    IReadOnlyList<string> MostMissingSkills);
