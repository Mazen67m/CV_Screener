using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace CVScreener.Tests;

/// <summary>
/// Unit tests for SkillsEngine.
/// Each test creates an in-memory taxonomy file to avoid file-system coupling.
/// </summary>
public class SkillsEngineTests : IDisposable
{
    private readonly string _taxonomyPath;
    private readonly ISkillsEngine _sut;

    // Minimal 3-skill taxonomy used by all tests
    private const string TaxonomyJson = """
        [
          { "canonical": "Python",     "aliases": ["python3", "py"] },
          { "canonical": "Kubernetes", "aliases": ["k8s", "kubectl"] },
          { "canonical": "React",      "aliases": ["reactjs", "react.js"] }
        ]
        """;

    public SkillsEngineTests()
    {
        // Write a temp taxonomy file; SkillsEngine reads from disk at construction.
        _taxonomyPath = Path.GetTempFileName();
        File.WriteAllText(_taxonomyPath, TaxonomyJson);

        var options = Options.Create(new SkillsEngineOptions { TaxonomyPath = _taxonomyPath });
        _sut = new SkillsEngine(options, NullLogger<SkillsEngine>.Instance);
    }

    public void Dispose() => File.Delete(_taxonomyPath);

    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Analyze_CanonicalFoundInCv_IsMatchedWithFullScore()
    {
        // JD requires Python; CV contains the canonical form "python"
        var result = _sut.Analyze(
            cleanedCv: "python developer 5 years experience",
            cleanedJd: "looking for a python engineer");

        Assert.Contains("Python", result.Matched);
        Assert.DoesNotContain("Python", result.Partial);
        Assert.DoesNotContain("Python", result.Missing);
        Assert.Equal(1.0, result.Score, precision: 4); // 1 matched / 1 required
    }

    [Fact]
    public void Analyze_AliasFoundInCvNotCanonical_IsPartialWithHalfScore()
    {
        // JD requires Python; CV contains only the alias "k8s" for Kubernetes
        var result = _sut.Analyze(
            cleanedCv: "worked with k8s for container orchestration",
            cleanedJd: "requires kubernetes experience");

        Assert.Contains("Kubernetes", result.Partial);
        Assert.DoesNotContain("Kubernetes", result.Matched);
        Assert.DoesNotContain("Kubernetes", result.Missing);
        Assert.Equal(0.5, result.Score, precision: 4); // 0.5 partial / 1 required
    }

    [Fact]
    public void Analyze_SkillInJdNotInCv_IsInMissingList()
    {
        // JD requires React; CV has no mention of it
        var result = _sut.Analyze(
            cleanedCv: "python backend developer with postgresql experience",
            cleanedJd: "react frontend developer needed");

        Assert.Contains("React", result.Missing);
        Assert.DoesNotContain("React", result.Matched);
        Assert.DoesNotContain("React", result.Partial);
        Assert.Equal(0.0, result.Score, precision: 4);
    }

    [Fact]
    public void Analyze_NoSkillsMentionedInJd_ReturnsEmptyArraysAndZeroScore()
    {
        // JD has no recognizable skills from taxonomy
        var result = _sut.Analyze(
            cleanedCv: "10 years experience in various domains",
            cleanedJd: "we are a great company looking for someone passionate");

        Assert.Empty(result.Matched);
        Assert.Empty(result.Partial);
        Assert.Empty(result.Missing);
        Assert.Equal(0.0, result.Score, precision: 4);
    }

    [Fact]
    public void Analyze_AllRequiredSkillsMatched_ReturnsScoreOfOne()
    {
        // JD requires Python and Kubernetes; CV has both canonical forms
        var result = _sut.Analyze(
            cleanedCv: "python and kubernetes developer with 5 years experience",
            cleanedJd: "need python developer with kubernetes knowledge");

        Assert.Contains("Python", result.Matched);
        Assert.Contains("Kubernetes", result.Matched);
        Assert.Empty(result.Partial);
        Assert.Empty(result.Missing);
        Assert.Equal(1.0, result.Score, precision: 4);
    }

    [Fact]
    public void Analyze_EmptyTexts_ReturnsEmptyResultsWithZeroScore()
    {
        var result = _sut.Analyze(cleanedCv: "", cleanedJd: "");

        Assert.Empty(result.Matched);
        Assert.Empty(result.Partial);
        Assert.Empty(result.Missing);
        Assert.Equal(0.0, result.Score, precision: 4);
    }
}
