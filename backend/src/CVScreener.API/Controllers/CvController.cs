using System.IO;
using System.Threading.Tasks;
using CVScreener.API.DTOs.Cv;
using CVScreener.Core;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CVScreener.API.Controllers;

/// <summary>Handles CV file upload and text extraction.</summary>
[ApiController]
[Route("api/cv")]
[Authorize]
public class CvController : ControllerBase
{
    private readonly ICvExtractionService _cvExtractionService;
    private readonly ILogger<CvController> _logger;

    public CvController(
        ICvExtractionService cvExtractionService,
        ILogger<CvController> logger)
    {
        _cvExtractionService = cvExtractionService;
        _logger = logger;
    }

    /// <summary>Uploads a PDF CV, extracts and cleans its text, and returns metadata.</summary>
    /// <remarks>
    /// Accepts multipart/form-data with a single PDF file (max 5 MB).
    /// Scanned, encrypted, or corrupted PDFs are rejected with 422.
    /// </remarks>
    /// <param name="request">Multipart form containing the PDF file.</param>
    /// <response code="200">Text extracted successfully.</response>
    /// <response code="400">No file provided, wrong type, or file too large.</response>
    /// <response code="401">Missing or invalid Clerk JWT.</response>
    /// <response code="422">Could not extract text (scanned, encrypted, corrupted, or too short).</response>
    /// <response code="500">Unexpected server error.</response>
    [HttpPost("extract")]
    [RequestSizeLimit(AppLimits.MaxFileSizeBytes)]
    [ProducesResponseType(typeof(CvExtractResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ExtractCv([FromForm] CvExtractRequest request)
    {
        // 1. Presence check — explicit message, not a type error
        if (request?.File == null || request.File.Length == 0)
        {
            return BadRequest(new { error = "No file provided." });
        }

        var file = request.File;

        // 2. Validate MIME type & file extension
        var extension = Path.GetExtension(file.FileName);
        if (!string.Equals(extension, ".pdf", System.StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(file.ContentType, "application/pdf", System.StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Invalid file type. PDF only." });
        }

        // 3. Validate file size (defense-in-depth; [RequestSizeLimit] handles it at the Kestrel level)
        if (file.Length > AppLimits.MaxFileSizeBytes)
        {
            return BadRequest(new { error = "File too large. Max 5MB." });
        }

        try
        {
            // 4. Extract text (injected service handles parsing, cleaning, and exception mapping)
            using var stream = file.OpenReadStream();
            var cleanedText = await _cvExtractionService.ExtractTextAsync(stream);

            // 5. Validate output text
            if (string.IsNullOrWhiteSpace(cleanedText))
            {
                return UnprocessableEntity(new { error = "Could not extract content from this file." });
            }

            var wordCount = TextCleaner.CountWords(cleanedText);
            if (wordCount < AppLimits.MinWordCount)
            {
                return UnprocessableEntity(new { error = "CV too short. Please upload a complete CV." });
            }

            var response = new CvExtractResponse
            {
                ExtractedText = cleanedText,
                WordCount = wordCount,
                ExtractionSuccess = true
            };

            return Ok(response);
        }
        catch (ScannedPdfException ex)
        {
            _logger.LogWarning(ex, "Scanned PDF submitted: {FileName}", file.FileName);
            return UnprocessableEntity(new { error = "PDF appears to be scanned. Please copy-paste your CV text." });
        }
        catch (EncryptedPdfException ex)
        {
            _logger.LogWarning(ex, "Encrypted PDF submitted: {FileName}", file.FileName);
            return UnprocessableEntity(new { error = "PDF is password-protected. Please remove the password and try again." });
        }
        catch (CorruptedPdfException ex)
        {
            _logger.LogWarning(ex, "Corrupted PDF submitted: {FileName}", file.FileName);
            return UnprocessableEntity(new { error = "File appears to be corrupted." });
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during CV extraction for file: {FileName}", file.FileName);
            return StatusCode(500, new { error = "An internal server error occurred." });
        }
    }
}
