using System.Security.Claims;
using CVScreener.API.DTOs.Analysis;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalysisController : ControllerBase
{
    private readonly IMatchingService _matchingService;
    private readonly IAnalysisRepository _analysisRepository;
    private readonly ICvExtractionService _cvExtractionService;

    public AnalysisController(
        IMatchingService matchingService,
        IAnalysisRepository analysisRepository,
        ICvExtractionService cvExtractionService)
    {
        _matchingService = matchingService;
        _analysisRepository = analysisRepository;
        _cvExtractionService = cvExtractionService;
    }

    /// <summary>
    /// Analyzes a CV against a job description and returns a scored breakdown.
    /// </summary>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(AnalyzeCreatedResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Analyze(
        [FromBody] AnalyzeRequest request,
        CancellationToken ct)
    {
        var clerkId = GetClerkId();
        if (string.IsNullOrEmpty(clerkId))
            return Unauthorized(new { error = "Clerk ID not found in token claims.", details = (string[]?)null });

        var cvText = await ResolveCvTextAsync(request);

        var result = await _matchingService.AnalyzeAsync(
            clerkId: clerkId,
            rawCvText: cvText,
            rawJdText: request.JdText,
            jobTitle: request.JobTitle,
            cancellationToken: ct);

        return CreatedAtAction(
            actionName: nameof(GetById),
            routeValues: new { id = result.Id },
            value: MapToAnalyzeCreatedResponse(result));
    }

    /// <summary>
    /// Returns the authenticated user's last 50 analyses in reverse chronological order.
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IReadOnlyList<HistoryItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetHistory(
        [FromQuery] int? limit,
        CancellationToken ct = default)
    {
        var clerkId = GetClerkId();
        if (string.IsNullOrEmpty(clerkId))
            return Unauthorized(new { error = "Clerk ID not found in token claims.", details = (string[]?)null });

        var history = await _analysisRepository.GetHistoryAsync(clerkId, limit, ct);
        return Ok(history.Select(MapToHistoryItemResponse));
    }

    /// <summary>
    /// Returns the full detail of a single analysis by its database ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AnalyzeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var clerkId = GetClerkId();
        if (string.IsNullOrEmpty(clerkId))
            return Unauthorized(new { error = "Clerk ID not found in token claims.", details = (string[]?)null });

        var result = await _analysisRepository.GetByIdAsync(id, clerkId, ct);
        if (result is null)
            throw new KeyNotFoundException($"Analysis {id} not found.");

        return Ok(MapToAnalyzeResponse(result));
    }

    private static AnalyzeCreatedResponse MapToAnalyzeCreatedResponse(AnalysisResult result)
    {
        var response = new AnalyzeCreatedResponse
        {
            IsFromCache = result.IsFromCache
        };

        PopulateAnalyzeResponse(response, result);
        return response;
    }

    private static AnalyzeResponse MapToAnalyzeResponse(AnalysisResult result)
    {
        var response = new AnalyzeResponse();
        PopulateAnalyzeResponse(response, result);
        return response;
    }

    private static void PopulateAnalyzeResponse(AnalyzeResponse response, AnalysisResult result)
    {
        response.Id = result.Id;
        response.JobTitle = result.JobTitle;
        response.CvText = result.CvText;
        response.JdText = result.JdText;
        response.OverallScore = result.OverallScore;
        response.TextSimilarity = result.TextSimilarity;
        response.SkillsScore = result.SkillsScore;
        response.ExperienceScore = result.ExperienceScore;
        response.CreatedAt = result.CreatedAt;
        response.Skills = new SkillBreakdownDto
        {
            Matched = result.Skills.Matched,
            Partial = result.Skills.Partial,
            Missing = result.Skills.Missing
        };
        response.Experience = new ExperienceBreakdownDto
        {
            CvYears = result.Experience.CvYears,
            RequiredYears = result.Experience.RequiredYears,
            Score = result.Experience.Score
        };
    }

    private static HistoryItemResponse MapToHistoryItemResponse(AnalysisHistoryItem item) => new()
    {
        Id = item.Id,
        JobTitle = item.JobTitle,
        OverallScore = item.OverallScore,
        MatchedSkillsCount = item.MatchedSkillsCount,
        MissingSkillsCount = item.MissingSkillsCount,
        CreatedAt = item.CreatedAt
    };

    private async Task<string> ResolveCvTextAsync(AnalyzeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CvBase64))
            return request.CvText!;

        var pdfBytes = Convert.FromBase64String(request.CvBase64);
        await using var pdfStream = new MemoryStream(pdfBytes);
        return await _cvExtractionService.ExtractTextAsync(pdfStream);
    }

    private string? GetClerkId() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value;
}
