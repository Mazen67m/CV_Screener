using CVScreener.Core.Interfaces;
using CVScreener.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CVScreener.Tests;

/// <summary>
/// Unit tests for ExperienceEngine.
/// ExperienceEngine has no external dependencies (no file I/O, no DB),
/// so it is instantiated directly.
/// </summary>
public class ExperienceEngineTests
{
    private readonly IExperienceEngine _sut;

    public ExperienceEngineTests()
    {
        _sut = new ExperienceEngine(NullLogger<ExperienceEngine>.Instance);
    }

    // ─────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Analyze_CvExceedsRequired_ScoreIsCappedAtOne()
    {
        // CV: 5 years, JD: 3 years → 5/3 = 1.67 → capped at 1.0
        var result = _sut.Analyze(
            cleanedCv: "5 years of experience in backend development",
            cleanedJd: "looking for 3 years experience in software engineering");

        Assert.Equal(1.0, result.Score, precision: 4);
        Assert.Equal(5, result.CvYears);
        Assert.Equal(3, result.RequiredYears);
        Assert.False(result.CvYearsFromFallback);
        Assert.False(result.RequiredYearsFromFallback);
    }

    [Fact]
    public void Analyze_CvBelowRequired_ScoreIsProportional()
    {
        // CV: 2 years, JD: 5 years → 2/5 = 0.4
        var result = _sut.Analyze(
            cleanedCv: "2 years experience in web development",
            cleanedJd: "requires 5 years of software engineering experience");

        Assert.Equal(0.4, result.Score, precision: 4);
        Assert.Equal(2, result.CvYears);
        Assert.Equal(5, result.RequiredYears);
    }

    [Fact]
    public void Analyze_SeniorityKeywordInCv_UsesFallbackYears()
    {
        // CV has "senior" (=5 years), JD requires 5 years explicitly → score = 1.0
        var result = _sut.Analyze(
            cleanedCv: "senior software engineer with extensive cloud experience",
            cleanedJd: "requires 5 years of experience in cloud architecture");

        Assert.Equal(1.0, result.Score, precision: 4);
        Assert.Equal(5, result.CvYears);
        Assert.True(result.CvYearsFromFallback);
        Assert.False(result.RequiredYearsFromFallback);
    }

    [Fact]
    public void Analyze_NoYearsOrSeniorityAnywhere_ReturnsNeutralScore()
    {
        // Neither text mentions years or seniority → Score = 0.5 (neutral)
        var result = _sut.Analyze(
            cleanedCv: "backend developer with skills in python django postgresql",
            cleanedJd: "looking for a developer to join our team and build apis");

        Assert.Equal(0.5, result.Score, precision: 4);
        Assert.Equal(0, result.CvYears);
        Assert.Equal(0, result.RequiredYears);
    }

    [Fact]
    public void Analyze_PlusSignAfterYears_ParsedCorrectly()
    {
        // "10+ years experience" → parses as 10
        var result = _sut.Analyze(
            cleanedCv: "10+ years experience in distributed systems engineering",
            cleanedJd: "requires 5 years of experience");

        Assert.Equal(10, result.CvYears);
        Assert.Equal(1.0, result.Score, precision: 4);
        Assert.False(result.CvYearsFromFallback);
    }

    [Fact]
    public void Analyze_JuniorInJdSeniorInCv_ScoreIsOne()
    {
        // JD wants junior (=1 year), CV has "senior" (=5 years) → 5/1 → capped at 1.0
        var result = _sut.Analyze(
            cleanedCv: "senior engineer 7 years experience in java and spring",
            cleanedJd: "entry-level position for junior developers to grow");

        Assert.Equal(1.0, result.Score, precision: 4);
    }
}
