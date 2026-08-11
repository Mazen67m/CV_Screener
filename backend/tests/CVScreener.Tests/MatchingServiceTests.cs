using CVScreener.Core.Entities;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace CVScreener.Tests;

public class MatchingServiceTests
{
    private const double WeightText = 0.50;
    private const double WeightSkills = 0.35;
    private const double WeightExperience = 0.15;

    [Fact]
    public void WeightConstants_SumToExactlyOne()
    {
        Assert.Equal(1.0, WeightText + WeightSkills + WeightExperience, precision: 10);
    }

    [Theory]
    [InlineData(1.0, 1.0, 1.0, 100)]
    [InlineData(0.0, 0.0, 0.0, 0)]
    [InlineData(0.5, 0.5, 0.5, 50)]
    [InlineData(1.0, 0.0, 0.0, 50)]
    [InlineData(0.0, 1.0, 0.0, 35)]
    [InlineData(0.0, 0.0, 1.0, 15)]
    [InlineData(0.8, 0.6, 0.5, 68)]
    [InlineData(0.3, 0.1, 0.5, 26)]
    public void ScoreFormula_KnownInputs_ProducesExpectedOverallScore(
        double textSimilarity,
        double skillsScore,
        double experienceScore,
        int expectedOverall)
    {
        var rawScore = WeightText * textSimilarity
            + WeightSkills * skillsScore
            + WeightExperience * experienceScore;

        var overallScore = (int)Math.Round(Math.Clamp(rawScore * 100, 0, 100));

        Assert.Equal(expectedOverall, overallScore);
    }

    [Fact]
    public void ScoreFormula_ClampPreventsScoreAbove100()
    {
        var rawScore = WeightText * 1.0001
            + WeightSkills * 1.0001
            + WeightExperience * 1.0001;

        var overallScore = (int)Math.Round(Math.Clamp(rawScore * 100, 0, 100));

        Assert.Equal(100, overallScore);
    }

    [Fact]
    public void ScoreFormula_ClampPreventsScoreBelow0()
    {
        var rawScore = WeightText * -0.001
            + WeightSkills * -0.001
            + WeightExperience * -0.001;

        var overallScore = (int)Math.Round(Math.Clamp(rawScore * 100, 0, 100));

        Assert.Equal(0, overallScore);
    }

    [Fact]
    public void ComputeMd5Hash_SameInput_AlwaysProducesSameHash()
    {
        const string input = "user_abc123python developer django rest apilooking for senior python engineer";

        var hash1 = MatchingService.ComputeMd5Hash(input);
        var hash2 = MatchingService.ComputeMd5Hash(input);

        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void ComputeMd5Hash_DifferentInputs_ProduceDifferentHashes()
    {
        var hash1 = MatchingService.ComputeMd5Hash("user_abccv text Ajd text A");
        var hash2 = MatchingService.ComputeMd5Hash("user_xyzcv text Bjd text B");

        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void ComputeMd5Hash_ReturnsLowercaseHexString()
    {
        var hash = MatchingService.ComputeMd5Hash("any-input-string");

        Assert.Equal(32, hash.Length);
        Assert.Matches("^[0-9a-f]{32}$", hash);
    }

    [Fact]
    public void ComputeMd5Hash_DifferentClerkId_ProducesDifferentHash()
    {
        const string cv = "python developer 5 years experience";
        const string jd = "senior python engineer role";

        var hashUser1 = MatchingService.ComputeMd5Hash("user_111" + cv + jd);
        var hashUser2 = MatchingService.ComputeMd5Hash("user_222" + cv + jd);

        Assert.NotEqual(hashUser1, hashUser2);
    }

    [Fact]
    public async Task AnalyzeAsync_UserNotFound_ThrowsKeyNotFoundException()
    {
        var userRepoMock = new Mock<IUserRepository>();
        userRepoMock
            .Setup(r => r.GetByClerkIdAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        var sut = BuildService(userRepoMock: userRepoMock);

        var ex = await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.AnalyzeAsync(
                clerkId: "user_unknown",
                rawCvText: "python developer with five years of experience in django and rest apis",
                rawJdText: "looking for a senior python engineer with flask and postgresql experience"));

        Assert.Contains("not found in the database", ex.Message);
        Assert.Contains("onboarding", ex.Message);
    }

    [Fact]
    public async Task AnalyzeAsync_UserNotFound_CallsUserRepositoryExactlyOnce()
    {
        var userRepoMock = new Mock<IUserRepository>();
        userRepoMock
            .Setup(r => r.GetByClerkIdAsync(It.IsAny<string>()))
            .ReturnsAsync((User?)null);

        var sut = BuildService(userRepoMock: userRepoMock);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            sut.AnalyzeAsync("user_x", "cv text with enough content here", "jd text content here"));

        userRepoMock.Verify(r => r.GetByClerkIdAsync("user_x"), Times.Once);
    }

    private static MatchingService BuildService(
        Mock<IUserRepository>? userRepoMock = null,
        Mock<IDbConnectionFactory>? dbFactoryMock = null,
        Mock<IOnnxInferenceService>? onnxMock = null,
        Mock<ISkillsEngine>? skillsMock = null,
        Mock<IExperienceEngine>? experienceMock = null)
    {
        userRepoMock ??= new Mock<IUserRepository>();
        dbFactoryMock ??= new Mock<IDbConnectionFactory>();
        onnxMock ??= new Mock<IOnnxInferenceService>();
        skillsMock ??= new Mock<ISkillsEngine>();
        experienceMock ??= new Mock<IExperienceEngine>();

        return new MatchingService(
            onnxMock.Object,
            skillsMock.Object,
            experienceMock.Object,
            userRepoMock.Object,
            dbFactoryMock.Object,
            NullLogger<MatchingService>.Instance);
    }
}
