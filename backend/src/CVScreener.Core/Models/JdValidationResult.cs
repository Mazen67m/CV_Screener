namespace CVScreener.Core.Models;

/// <summary>
/// The result produced by <see cref="Interfaces.IJdValidationService.Validate"/>.
/// Contains the cleaned job description text, its word count, and validation status.
/// </summary>
public record JdValidationResult(string CleanedText, int WordCount, bool Valid);
