using System.Security.Claims;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

/// <summary>
/// Provides aggregated dashboard metrics for the authenticated user.
/// All metrics are scoped to the user's own analyses via Clerk JWT.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class DashboardController : ControllerBase
{
    private readonly IDashboardRepository _dashboardRepository;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        IDashboardRepository dashboardRepository,
        ILogger<DashboardController> logger)
    {
        _dashboardRepository = dashboardRepository;
        _logger              = logger;
    }

    /// <summary>
    /// Returns aggregated metrics derived from the authenticated user's analyses.
    /// Metrics include: total count, average score, best score, and most frequently
    /// missing skills across all analyses.
    /// </summary>
    /// <remarks>
    /// When the user has no analyses, returns zeros and empty arrays — not an error.
    /// Most-missing skills are computed via JSONB unnest and frequency ranking.
    /// </remarks>
    /// <response code="200">Metrics returned successfully.</response>
    /// <response code="401">Missing or invalid Clerk JWT.</response>
    /// <response code="500">Unexpected server error.</response>
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(DashboardMetricsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetMetrics(CancellationToken ct)
    {
        var clerkId = GetClerkId();
        if (string.IsNullOrEmpty(clerkId))
            return Unauthorized(new { error = "Clerk ID not found in token claims." });

        try
        {
            var metrics = await _dashboardRepository.GetMetricsAsync(clerkId, ct);

            return Ok(new DashboardMetricsResponse
            {
                TotalAnalyses     = metrics.TotalAnalyses,
                AverageScore      = metrics.AverageScore,
                BestScore         = metrics.BestScore,
                MostMissingSkills = metrics.MostMissingSkills
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching dashboard metrics for clerkId={ClerkId}", clerkId);
            return StatusCode(500, new { error = "An internal server error occurred." });
        }
    }

    private string? GetClerkId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value;
}

/// <summary>Response body for GET /api/dashboard/metrics.</summary>
public class DashboardMetricsResponse
{
    /// <summary>Total number of analyses performed by this user.</summary>
    public int TotalAnalyses { get; set; }

    /// <summary>Average overall score across all analyses. Null when user has no analyses.</summary>
    public int? AverageScore { get; set; }

    /// <summary>Highest overall score achieved. Null when user has no analyses.</summary>
    public int? BestScore { get; set; }

    /// <summary>
    /// Top 5 skills most frequently appearing in the user's missing_skills columns,
    /// ordered by frequency descending. Empty list when user has no analyses.
    /// </summary>
    public IReadOnlyList<string> MostMissingSkills { get; set; } = [];
}
