using CVScreener.Core.Models;

namespace CVScreener.Core.Interfaces;

public interface IJdValidationService
{
    /// <summary>
    /// Validates and cleans a job description asynchronously.
    /// </summary>
    /// <param name="rawText">The raw job description text pasted by the user.</param>
    /// <returns>A validation result containing the cleaned text and word count.</returns>
    /// <exception cref="Exceptions.JdTooShortException">Thrown if the word count is less than 50.</exception>
    /// <exception cref="Exceptions.JdTooLongException">Thrown if the word count is more than 5000.</exception>
    Task<JdValidationResult> ValidateAsync(string rawText);
}
