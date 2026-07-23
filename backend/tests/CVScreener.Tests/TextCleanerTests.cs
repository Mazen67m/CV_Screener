using CVScreener.Core;
using Xunit;

namespace CVScreener.Tests;

public class TextCleanerTests
{
    [Fact]
    public void Clean_RemovesSpecialCharacters()
    {
        var result = TextCleaner.Clean("Hello! World. C# .NET @2024");
        Assert.Equal("hello world c net 2024", result);
    }

    [Fact]
    public void Clean_PreservesHyphens()
    {
        var result = TextCleaner.Clean("we need a full-stack developer");
        Assert.Equal("we need a full-stack developer", result);
    }

    [Fact]
    public void Clean_NormalizesMultipleSpaces()
    {
        var result = TextCleaner.Clean("too   many    spaces");
        Assert.Equal("too many spaces", result);
    }

    [Fact]
    public void Clean_ConvertsToLowercase()
    {
        var result = TextCleaner.Clean("John DOE");
        Assert.Equal("john doe", result);
    }

    [Fact]
    public void Clean_TrimsLeadingAndTrailingWhitespace()
    {
        var result = TextCleaner.Clean("  trimmed  ");
        Assert.Equal("trimmed", result);
    }

    [Fact]
    public void Clean_EmptyInput_ReturnsEmpty()
    {
        var result = TextCleaner.Clean("");
        Assert.Equal("", result);
    }

    [Fact]
    public void Clean_NullInput_ReturnsEmpty()
    {
        var result = TextCleaner.Clean(null!);
        Assert.Equal("", result);
    }

    [Fact]
    public void Clean_SymbolHeavyInput_ReducesWordCount()
    {
        var input = "hello @#$% world";
        var cleaned = TextCleaner.Clean(input);
        
        Assert.Equal("hello world", cleaned);
        Assert.Equal(2, TextCleaner.CountWords(cleaned));
    }

    [Fact]
    public void CountWords_ReturnsCorrectCount()
    {
        var count = TextCleaner.CountWords("hello world");
        Assert.Equal(2, count);
    }

    [Fact]
    public void CountWords_EmptyString_ReturnsZero()
    {
        var count = TextCleaner.CountWords("");
        Assert.Equal(0, count);
    }

    [Fact]
    public void CountWords_SingleWord_ReturnsOne()
    {
        var count = TextCleaner.CountWords("hello");
        Assert.Equal(1, count);
    }

    [Fact]
    public void CountWords_MultipleSpacesBetweenWords_CountsCorrectly()
    {
        var count = TextCleaner.CountWords("hello   world");
        Assert.Equal(2, count);
    }
}
