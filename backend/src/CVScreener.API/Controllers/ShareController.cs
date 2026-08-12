using CVScreener.API.DTOs.Analysis;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ShareController : ControllerBase
{
    private readonly IAnalysisRepository _analysisRepository;

    public ShareController(IAnalysisRepository analysisRepository)
    {
        _analysisRepository = analysisRepository;
    }

    /// <summary>
    /// Returns a public, PII-free analysis result. The UUID in the URL is the access token.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AnalyzeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetShared(Guid id, CancellationToken ct)
    {
        var result = await _analysisRepository.GetByIdPublicAsync(id, ct);
        if (result is null)
            return NotFound(new { error = $"Analysis {id} not found." });

        return Ok(MapToAnalyzeResponse(result));
    }

    private static AnalyzeResponse MapToAnalyzeResponse(AnalysisResult result) => new()
    {
        Id = result.Id,
        JobTitle = result.JobTitle,
        CvText = string.Empty,
        JdText = string.Empty,
        OverallScore = result.OverallScore,
        TextSimilarity = result.TextSimilarity,
        SkillsScore = result.SkillsScore,
        ExperienceScore = result.ExperienceScore,
        CreatedAt = result.CreatedAt,
        Skills = new SkillBreakdownDto
        {
            Matched = result.Skills.Matched,
            Partial = result.Skills.Partial,
            Missing = result.Skills.Missing
        },
        Experience = new ExperienceBreakdownDto
        {
            CvYears = result.Experience.CvYears,
            RequiredYears = result.Experience.RequiredYears,
            Score = result.Experience.Score
        }
    };
}
