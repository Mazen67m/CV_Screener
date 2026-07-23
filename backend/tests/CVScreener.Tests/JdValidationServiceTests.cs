using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using CVScreener.Infrastructure.Services;
using Xunit;

namespace CVScreener.Tests;

public class JdValidationServiceTests
{
    private readonly IJdValidationService _service;

    public JdValidationServiceTests()
    {
        _service = new JdValidationService();
    }

    [Fact]
    public async Task Validate_WithNullInput_ThrowsArgumentNullException()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.ValidateAsync(null!));
    }

    [Fact]
    public async Task Validate_WithEmptyString_ThrowsJdTooShortException()
    {
        await Assert.ThrowsAsync<JdTooShortException>(() => _service.ValidateAsync(""));
    }

    [Fact]
    public async Task Validate_WithWhitespaceOnly_ThrowsJdTooShortException()
    {
        await Assert.ThrowsAsync<JdTooShortException>(() => _service.ValidateAsync("    \n\t  "));
    }

    [Fact]
    public async Task Validate_With49CleanedWords_ThrowsJdTooShortException()
    {
        var text = string.Join(" ", Enumerable.Repeat("word", 49));
        await Assert.ThrowsAsync<JdTooShortException>(() => _service.ValidateAsync(text));
    }

    [Fact]
    public async Task Validate_WithExactly50CleanedWords_ReturnsValidResult()
    {
        var text = string.Join(" ", Enumerable.Repeat("word", 50));
        var result = await _service.ValidateAsync(text);

        Assert.True(result.Valid);
        Assert.Equal(50, result.WordCount);
    }

    [Fact]
    public async Task Validate_WithExactly5000CleanedWords_ReturnsValidResult()
    {
        var text = string.Join(" ", Enumerable.Repeat("word", 5000));
        var result = await _service.ValidateAsync(text);

        Assert.True(result.Valid);
        Assert.Equal(5000, result.WordCount);
    }

    [Fact]
    public async Task Validate_With5001CleanedWords_ThrowsJdTooLongException()
    {
        var text = string.Join(" ", Enumerable.Repeat("word", 5001));
        await Assert.ThrowsAsync<JdTooLongException>(() => _service.ValidateAsync(text));
    }

    [Fact]
    public async Task Validate_ReturnsCleanedText_LowercasedAndPunctuationStripped()
    {
        // 50 words with some punctuation, uppercase, and special chars
        var words = new string[] { "Hello!", "World.C#", ".NET", "@2026," };
        var repeated = Enumerable.Repeat(words, 15); // 15 * 4 = 60 words
        var rawText = string.Join(" ", repeated.SelectMany(x => x));

        var result = await _service.ValidateAsync(rawText);

        Assert.True(result.Valid);
        Assert.Equal(75, result.WordCount);
        // Verify output is clean (no exclamation, comma, periods, uppercase, etc.)
        Assert.DoesNotContain("!", result.CleanedText);
        Assert.DoesNotContain(".", result.CleanedText);
        Assert.DoesNotContain(",", result.CleanedText);
        Assert.DoesNotContain("@", result.CleanedText);
        Assert.Contains("hello", result.CleanedText);
        Assert.Contains("world c", result.CleanedText); // "World.C#" cleaned to "world c"
        Assert.Contains("net", result.CleanedText);
        Assert.Contains("2026", result.CleanedText);
    }

    /// <summary>
    /// DEC-008 compliance: word count must be derived from cleaned text, not the raw input.
    /// A JD with 55 raw tokens but only 49 cleaned words (punctuation inflating raw count)
    /// must throw JdTooShortException, proving the backend counts AFTER cleaning.
    /// </summary>
    [Fact]
    public async Task Validate_WordCountDerivesFromCleanedText_NotRaw()
    {
        // Build 55 raw "words" that each clean down to a single real word,
        // but 6 of them are punctuation-only tokens that vanish after cleaning.
        // e.g. "!!!", "@@@", "###" → stripped completely → 0 cleaned words each.
        // Result: 55 raw tokens, 49 cleaned words → should throw JdTooShortException.
        var realWords = Enumerable.Repeat("word", 49);
        var punctuationOnly = Enumerable.Repeat("!!!", 6); // clean to empty
        var rawText = string.Join(" ", realWords.Concat(punctuationOnly));

        // Sanity: raw split gives 55 tokens
        Assert.Equal(55, rawText.Split(' ').Length);

        // Backend must count from cleaned text (49 words) → too short
        await Assert.ThrowsAsync<JdTooShortException>(() => _service.ValidateAsync(rawText));
    }
}
