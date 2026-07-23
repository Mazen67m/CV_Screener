using System;
using System.Text.RegularExpressions;

namespace CVScreener.Core;

public static class TextCleaner
{
    private static readonly Regex SpecialCharsRegex = new Regex(@"[^a-z0-9\s-]", RegexOptions.Compiled);
    private static readonly Regex CollapseSpacesRegex = new Regex(@"\s+", RegexOptions.Compiled);

    /// <summary>
    /// Cleans raw extracted PDF text:
    /// - Converts to lowercase.
    /// - Replaces special characters with a space, EXCEPT alphanumeric, whitespace, and hyphens.
    ///   Hyphens are intentionally preserved (DEC-010) because common CV terms such as
    ///   "full-stack", "entry-level", and "C-suite" rely on them. Removing hyphens would
    ///   split these into separate tokens and degrade TF-IDF and skills matching accuracy.
    /// - Collapses multiple consecutive whitespaces into a single space.
    /// - Trims leading and trailing whitespaces.
    /// </summary>
    /// <param name="rawText">The raw input text.</param>
    /// <returns>The cleaned and normalized text.</returns>
    public static string Clean(string rawText)
    {
        if (string.IsNullOrEmpty(rawText))
        {
            return string.Empty;
        }

        // 1. Lowercase entire string
        string lower = rawText.ToLowerInvariant();

        // 2. Replace non-alphanumeric, non-space, non-hyphen with space
        string cleaned = SpecialCharsRegex.Replace(lower, " ");

        // 3. Collapse multiple spaces into a single space
        string normalized = CollapseSpacesRegex.Replace(cleaned, " ");

        // 4. Trim leading/trailing whitespace
        return normalized.Trim();
    }

    /// <summary>
    /// Counts whitespace-delimited words in a string.
    /// </summary>
    /// <param name="text">Any string (typically cleaned text).</param>
    /// <returns>Word count as int.</returns>
    public static int CountWords(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return 0;
        }

        return text.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries).Length;
    }
}
