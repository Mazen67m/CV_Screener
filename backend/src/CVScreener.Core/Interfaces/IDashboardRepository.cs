using CVScreener.Core.Models;

namespace CVScreener.Core.Interfaces;

/// <summary>
/// Provides aggregated dashboard metrics for an authenticated user.
/// All queries are scoped to the user's own analyses via clerkId.
/// </summary>
public interface IDashboardRepository
{
    /// <summary>
    /// Returns aggregated metrics for the user's analyses.
    /// Returns zeroed metrics (not null) when the user has no analyses.
    /// </summary>
    Task<DashboardMetrics> GetMetricsAsync(string clerkId, CancellationToken ct = default);
}
