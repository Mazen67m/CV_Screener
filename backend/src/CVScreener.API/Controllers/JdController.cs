using CVScreener.API.DTOs.Jd;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CVScreener.API.Controllers;

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

    /// <summary>
    /// POST /api/jd/validate
    /// Validates a job description's word count after cleaning and returns the metadata.
    /// </summary>
    [HttpPost("validate")]
    [RequestSizeLimit(524_288)] // 512 KB — 5,000 words ≈ 35 KB; blocks oversized payloads
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
