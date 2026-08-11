using System.ComponentModel.DataAnnotations;
using CVScreener.API.Validation;

namespace CVScreener.API.DTOs.Analysis;

/// <summary>
/// Request body for POST /api/analysis/analyze.
/// Accepts either raw CV text or a base64-encoded PDF, but not both.
/// </summary>
public class AnalyzeRequest : IValidatableObject
{
    /// <summary>
    /// Raw extracted CV text. Required when CvBase64 is absent.
    /// </summary>
    [MinLength(50,    ErrorMessage = "CV text is too short (minimum 50 characters).")]
    [MaxLength(50000, ErrorMessage = "CV text is too long (maximum 50,000 characters).")]
    [NotWhitespace]
    public string? CvText { get; set; }

    /// <summary>
    /// Base64-encoded PDF file. Required when CvText is absent.
    /// </summary>
    [MaxLength(6_800_000, ErrorMessage = "CV PDF is too large (maximum 5 MB).")]
    public string? CvBase64 { get; set; }

    /// <summary>
    /// Raw job description text. Minimum 20 chars (any real JD will exceed this easily).
    /// Max 10,000 chars.
    /// </summary>
    [Required(AllowEmptyStrings = true, ErrorMessage = "Job description text is required.")]
    [MinLength(20,    ErrorMessage = "JD text is too short (minimum 20 characters).")]
    [MaxLength(10000, ErrorMessage = "JD text is too long (maximum 10,000 characters).")]
    [NotWhitespace]
    public string JdText { get; set; } = string.Empty;

    /// <summary>
    /// Optional display label for the role being applied to.
    /// Stored in the analyses table and shown in history (D-11, D-12).
    /// Not used in scoring — purely informational.
    /// </summary>
    [MaxLength(200, ErrorMessage = "Job title is too long (maximum 200 characters).")]
    public string? JobTitle { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var hasText = !string.IsNullOrWhiteSpace(CvText);
        var hasBase64 = !string.IsNullOrWhiteSpace(CvBase64);

        if (!hasText && !hasBase64)
        {
            yield return new ValidationResult(
                "Either cvText or cvBase64 must be provided.",
                [nameof(CvText), nameof(CvBase64)]);
        }

        if (hasText && hasBase64)
        {
            yield return new ValidationResult(
                "Provide either cvText or cvBase64, not both.",
                [nameof(CvText), nameof(CvBase64)]);
        }
    }
}
