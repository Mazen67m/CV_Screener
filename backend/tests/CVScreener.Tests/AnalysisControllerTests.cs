using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using CVScreener.API.Controllers;
using CVScreener.API.DTOs.Analysis;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace CVScreener.Tests;

public class AnalysisControllerTests
{
    [Fact]
    public async Task PostAnalyze_ValidRequest_Returns201WithLocationHeader()
    {
        var result = BuildAnalysisResult(isFromCache: true);
        const string cvText = "Senior developer with enough experience to satisfy validation constraints.";
        var matching = new Mock<IMatchingService>();
        matching
            .Setup(s => s.AnalyzeAsync("user_123", cvText, "valid jd", "Role", It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        var controller = BuildController(matchingService: matching.Object);
        SetAuthenticatedUser(controller, "user_123");

        var response = await controller.Analyze(new AnalyzeRequest
        {
            CvText = cvText,
            JdText = "valid jd",
            JobTitle = "Role"
        }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(response);
        Assert.Equal(nameof(AnalysisController.GetById), created.ActionName);
        Assert.Equal(result.Id, created.RouteValues?["id"]);

        var body = Assert.IsType<AnalyzeCreatedResponse>(created.Value);
        Assert.True(body.IsFromCache);
    }

    [Fact]
    public void PostAnalyze_WhitespaceCvText_HasValidationError()
    {
        var request = new AnalyzeRequest
        {
            CvText = "                                                  ",
            JdText = "valid job description text"
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.ErrorMessage == "The field must not be empty or contain only whitespace.");
    }

    [Fact]
    public void PostAnalyze_EmptyCvText_HasValidationError()
    {
        var request = new AnalyzeRequest
        {
            CvText = string.Empty,
            JdText = "valid job description text"
        };

        var errors = Validate(request);

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void PostAnalyze_CvTextTooShort_HasValidationError()
    {
        var request = new AnalyzeRequest
        {
            CvText = "too short",
            JdText = "valid job description text"
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.ErrorMessage == "CV text is too short (minimum 50 characters).");
    }

    [Fact]
    public void PostAnalyze_BothCvTextAndCvBase64_HasValidationError()
    {
        var request = new AnalyzeRequest
        {
            CvText = "Senior developer with enough experience to satisfy validation constraints.",
            CvBase64 = Convert.ToBase64String([1, 2, 3]),
            JdText = "valid job description text"
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.ErrorMessage == "Provide either cvText or cvBase64, not both.");
    }

    [Fact]
    public void PostAnalyze_NeitherCvTextNorCvBase64_HasValidationError()
    {
        var request = new AnalyzeRequest
        {
            JdText = "valid job description text"
        };

        var errors = Validate(request);

        Assert.Contains(errors, error => error.ErrorMessage == "Either cvText or cvBase64 must be provided.");
    }

    [Fact]
    public async Task PostAnalyze_ValidBase64Pdf_ExtractsTextAndReturns201()
    {
        const string extractedCvText = "extracted pdf cv text with enough content for matching service";
        var base64Pdf = Convert.ToBase64String([1, 2, 3]);
        var result = BuildAnalysisResult(isFromCache: false);

        var matching = new Mock<IMatchingService>();
        matching
            .Setup(s => s.AnalyzeAsync("user_123", extractedCvText, "valid jd", "Role", It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        var cvExtraction = new Mock<ICvExtractionService>();
        cvExtraction
            .Setup(s => s.ExtractTextAsync(It.IsAny<Stream>()))
            .ReturnsAsync(extractedCvText);

        var controller = BuildController(
            matchingService: matching.Object,
            cvExtractionService: cvExtraction.Object);
        SetAuthenticatedUser(controller, "user_123");

        var response = await controller.Analyze(new AnalyzeRequest
        {
            CvBase64 = base64Pdf,
            JdText = "valid jd",
            JobTitle = "Role"
        }, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(response);
        Assert.IsType<AnalyzeCreatedResponse>(created.Value);
    }

    [Fact]
    public async Task PostAnalyze_UnauthenticatedRequest_Returns401()
    {
        var controller = BuildController();

        var response = await controller.Analyze(new AnalyzeRequest(), CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(response);
    }

    [Fact]
    public async Task PostAnalyze_UserNotOnboarded_ThrowsKeyNotFoundException()
    {
        var matching = new Mock<IMatchingService>();
        matching
            .Setup(s => s.AnalyzeAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new KeyNotFoundException("User not found."));

        var controller = BuildController(matchingService: matching.Object);
        SetAuthenticatedUser(controller, "user_123");

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            controller.Analyze(new AnalyzeRequest { CvText = "cv", JdText = "jd" }, CancellationToken.None));
    }

    [Fact]
    public async Task GetHistory_AuthenticatedUser_Returns200()
    {
        var repository = new Mock<IAnalysisRepository>();
        repository
            .Setup(r => r.GetHistoryAsync("user_123", 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Range(0, 5).Select(index => new AnalysisHistoryItem
            {
                Id = Guid.NewGuid(),
                OverallScore = index,
                CreatedAt = DateTime.UtcNow
            }).ToArray());

        var controller = BuildController(repository: repository.Object);
        SetAuthenticatedUser(controller, "user_123");

        var response = await controller.GetHistory(5, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        var body = Assert.IsAssignableFrom<IEnumerable<HistoryItemResponse>>(ok.Value);
        Assert.Equal(5, body.Count());
    }

    [Fact]
    public async Task GetAnalysis_ValidId_OwnedByUser_Returns200WithoutIsFromCache()
    {
        var id = Guid.NewGuid();
        var repository = new Mock<IAnalysisRepository>();
        repository
            .Setup(r => r.GetByIdAsync(id, "user_123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(BuildAnalysisResult(isFromCache: true));

        var controller = BuildController(repository: repository.Object);
        SetAuthenticatedUser(controller, "user_123");

        var response = await controller.GetById(id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(response);
        Assert.IsType<AnalyzeResponse>(ok.Value);
        Assert.IsNotType<AnalyzeCreatedResponse>(ok.Value);
    }

    [Fact]
    public async Task GetAnalysis_ValidId_OtherUsersAnalysis_ThrowsUnauthorizedAccessException()
    {
        var id = Guid.NewGuid();
        var repository = new Mock<IAnalysisRepository>();
        repository
            .Setup(r => r.GetByIdAsync(id, "user_123", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new UnauthorizedAccessException());

        var controller = BuildController(repository: repository.Object);
        SetAuthenticatedUser(controller, "user_123");

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            controller.GetById(id, CancellationToken.None));
    }

    [Fact]
    public async Task GetAnalysis_MissingId_ThrowsKeyNotFoundException()
    {
        var id = Guid.NewGuid();
        var repository = new Mock<IAnalysisRepository>();
        repository
            .Setup(r => r.GetByIdAsync(id, "user_123", It.IsAny<CancellationToken>()))
            .ReturnsAsync((AnalysisResult?)null);

        var controller = BuildController(repository: repository.Object);
        SetAuthenticatedUser(controller, "user_123");

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            controller.GetById(id, CancellationToken.None));
    }

    private static IReadOnlyList<ValidationResult> Validate(AnalyzeRequest request)
    {
        var context = new ValidationContext(request);
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(request, context, results, validateAllProperties: true);
        return results;
    }

    private static AnalysisController BuildController(
        IMatchingService? matchingService = null,
        IAnalysisRepository? repository = null,
        ICvExtractionService? cvExtractionService = null,
        ILearningPathRepository? learningPathRepository = null)
    {
        matchingService        ??= Mock.Of<IMatchingService>();
        repository             ??= Mock.Of<IAnalysisRepository>();
        cvExtractionService    ??= Mock.Of<ICvExtractionService>();
        learningPathRepository ??= Mock.Of<ILearningPathRepository>();

        return new AnalysisController(matchingService, repository, cvExtractionService, learningPathRepository)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    private static void SetAuthenticatedUser(ControllerBase controller, string clerkId)
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, clerkId)],
            "TestAuth");

        controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
    }

    private static AnalysisResult BuildAnalysisResult(bool isFromCache) => new()
    {
        Id = Guid.NewGuid(),
        JobTitle = "Role",
        CvText = "valid cv",
        JdText = "valid jd",
        OverallScore = 75,
        TextSimilarity = 0.75,
        SkillsScore = 0.5,
        ExperienceScore = 1,
        Skills = new SkillsResult
        {
            Matched = ["Python"],
            Partial = [],
            Missing = ["PostgreSQL"],
            Score = 0.5
        },
        Experience = new ExperienceResult
        {
            CvYears = 5,
            RequiredYears = 3,
            Score = 1
        },
        IsFromCache = isFromCache,
        CreatedAt = DateTime.UtcNow
    };
}
