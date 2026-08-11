using CVScreener.API.DTOs.Jd;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CVScreener.API.Controllers;

/// <summary>Handles Job Description validation.</summary>
[ApiController]
[Route("api/jd")]
[Authorize]
public class JdController : ControllerBase
{
    private readonly IJdValidationService _jdValidationService;
    private readonly ILogger<JdController> _logger;

    public JdController(
        IJdValidationService jdValidationService,
        ILogger<JdController> logger)
    {
        _jdValidationService = jdValidationService;
        _logger = logger;
    }

    /// <summary>Validates a job description's word count after cleaning and returns the metadata.</summary>
    /// <param name="request">Object containing the raw job description text.</param>
    /// <response code="200">Validation passed — cleaned text and word count returned.</response>
    /// <response code="400">Text missing, too short (&lt;50 words), or too long (&gt;5 000 words).</response>
    /// <response code="401">Missing or invalid Clerk JWT.</response>
    /// <response code="500">Unexpected server error.</response>
    [HttpPost("validate")]
    [RequestSizeLimit(524_288)] // 512 KB — 5,000 words ≈ 35 KB; blocks oversized payloads
    [ProducesResponseType(typeof(JdValidateResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ValidateJd([FromBody] JdValidateRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequest(new { error = "Job description text must be provided." });
        }

        try
        {
            var result = await _jdValidationService.ValidateAsync(request.Text);

            var response = new JdValidateResponse
            {
                CleanedText = result.CleanedText,
                WordCount = result.WordCount,
                Valid = result.Valid
            };

            return Ok(response);
        }
        catch (JdTooShortException)
        {
            // Expected business rule violation — log without exception object to
            // avoid noisy stack traces in warning-level logs.
            _logger.LogWarning("Job description validation failed: too short.");
            return BadRequest(new { error = "Job description too short. Minimum 50 words." });
        }
        catch (JdTooLongException)
        {
            _logger.LogWarning("Job description validation failed: too long.");
            return BadRequest(new { error = "Job description too long. Maximum 5000 words." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during job description validation.");
            return StatusCode(500, new { error = "An internal server error occurred." });
        }
    }
}
