using CVScreener.Core;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;

namespace CVScreener.Infrastructure.Services;

public class JdValidationService : IJdValidationService
{
    /// <inheritdoc/>
    /// <remarks>
    /// Currently CPU-only (no I/O), so the Task is returned directly via
    /// Task.FromResult / Task.FromException rather than using async/await,
    /// which avoids unnecessary state-machine overhead.
    /// Replace with a genuine async implementation when DB or network calls
    /// are introduced (e.g. persisting the cleaned JD, taxonomy look-ups).
    /// </remarks>
    public Task<JdValidationResult> ValidateAsync(string rawText)
    {
        if (rawText == null)
        {
            return Task.FromException<JdValidationResult>(
                new ArgumentNullException(nameof(rawText), "Job description text cannot be null."));
        }

        // 1. Clean raw text first to derive word count from cleaned text (DEC-008).
        var cleanedText = TextCleaner.Clean(rawText);

        // 2. Count words on the cleaned text.
        var wordCount = TextCleaner.CountWords(cleanedText);

        // 3. Validate word count bounds.
        if (wordCount < AppLimits.JdMinWordCount)
        {
            return Task.FromException<JdValidationResult>(
                new JdTooShortException($"Job description too short. Minimum {AppLimits.JdMinWordCount} words."));
        }

        if (wordCount > AppLimits.JdMaxWordCount)
        {
            return Task.FromException<JdValidationResult>(
                new JdTooLongException($"Job description too long. Maximum {AppLimits.JdMaxWordCount} words."));
        }

        return Task.FromResult(new JdValidationResult(cleanedText, wordCount, Valid: true));
    }
}
