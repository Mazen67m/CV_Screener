using CVScreener.Core.Entities;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Npgsql;

namespace CVScreener.Tests;

[Trait("Category", "Integration")]
public class MatchingServiceIntegrationTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _database;

    public MatchingServiceIntegrationTests(DatabaseFixture database)
    {
        _database = database;
    }

    [Fact]
    public async Task AnalyzeAsync_CacheMiss_InsertsNewRow_ReturnsIsFromCacheFalse()
    {
        var clerkId = $"user_{Guid.NewGuid():N}";
        var user = await InsertUserAsync(clerkId);
        var sut = BuildService(user);

        var result = await sut.AnalyzeAsync(
            clerkId,
            "python developer with 5 years experience building rest api services",
            "python backend engineer role requiring 3 years experience with rest api",
            "Backend Engineer");

        Assert.False(result.IsFromCache);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(1, await CountAnalysesAsync(user.Id));
    }

    [Fact]
    public async Task AnalyzeAsync_CacheHit_ReturnsCachedResult_IsFromCacheTrue()
    {
        var clerkId = $"user_{Guid.NewGuid():N}";
        var user = await InsertUserAsync(clerkId);
        var sut = BuildService(user);

        const string cv = "python developer with 5 years experience building rest api services";
        const string jd = "python backend engineer role requiring 3 years experience with rest api";

        var first = await sut.AnalyzeAsync(clerkId, cv, jd, "Backend Engineer");
        var second = await sut.AnalyzeAsync(clerkId, cv, jd, "Backend Engineer");

        Assert.False(first.IsFromCache);
        Assert.True(second.IsFromCache);
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await CountAnalysesAsync(user.Id));
    }

    [Fact]
    public async Task AnalyzeAsync_RaceCondition23505_ReturnsFromCacheInsteadOf500()
    {
        var clerkId = $"user_{Guid.NewGuid():N}";
        var user = await InsertUserAsync(clerkId);
        var sut = BuildService(user);

        const string cv = "python developer with 5 years experience building rest api services";
        const string jd = "python backend engineer role requiring 3 years experience with rest api";

        var tasks = Enumerable.Range(0, 4)
            .Select(_ => sut.AnalyzeAsync(clerkId, cv, jd, "Backend Engineer"))
            .ToArray();

        var results = await Task.WhenAll(tasks);

        Assert.Single(results.Select(result => result.Id).Distinct());
        Assert.Contains(results, result => result.IsFromCache);
        Assert.Equal(1, await CountAnalysesAsync(user.Id));
    }

    private MatchingService BuildService(User user)
    {
        var onnxMock = new Mock<IOnnxInferenceService>();
        onnxMock
            .Setup(s => s.Vectorize(It.IsAny<string>()))
            .Returns([1f, 0f]);
        onnxMock
            .Setup(s => s.CosineSimilarity(It.IsAny<float[]>(), It.IsAny<float[]>()))
            .Returns(0.75);

        var skillsMock = new Mock<ISkillsEngine>();
        skillsMock
            .Setup(s => s.Analyze(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(new SkillsResult
            {
                Matched = ["Python"],
                Partial = ["REST API"],
                Missing = ["PostgreSQL"],
                Score = 0.5
            });

        var experienceMock = new Mock<IExperienceEngine>();
        experienceMock
            .Setup(s => s.Analyze(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(new ExperienceResult
            {
                CvYears = 5,
                RequiredYears = 3,
                Score = 1
            });

        var userRepoMock = new Mock<IUserRepository>();
        userRepoMock
            .Setup(r => r.GetByClerkIdAsync(user.ClerkId))
            .ReturnsAsync(user);

        return new MatchingService(
            onnxMock.Object,
            skillsMock.Object,
            experienceMock.Object,
            userRepoMock.Object,
            new TestDbConnectionFactory(_database.ConnectionString),
            NullLogger<MatchingService>.Instance);
    }

    private async Task<User> InsertUserAsync(string clerkId)
    {
        await using var conn = new NpgsqlConnection(_database.ConnectionString);
        await conn.OpenAsync();

        const string sql = """
            INSERT INTO users (clerk_id, email, role)
            VALUES (@ClerkId, @Email, 'job_seeker')
            RETURNING id, created_at;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("ClerkId", clerkId);
        cmd.Parameters.AddWithValue("Email", $"{clerkId}@example.com");

        await using var reader = await cmd.ExecuteReaderAsync();
        await reader.ReadAsync();

        return new User
        {
            Id = reader.GetGuid(reader.GetOrdinal("id")),
            ClerkId = clerkId,
            Email = $"{clerkId}@example.com",
            Role = "job_seeker",
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }

    private async Task<int> CountAnalysesAsync(Guid userId)
    {
        await using var conn = new NpgsqlConnection(_database.ConnectionString);
        await conn.OpenAsync();

        await using var cmd = new NpgsqlCommand(
            "SELECT COUNT(*) FROM analyses WHERE user_id = @UserId;",
            conn);
        cmd.Parameters.AddWithValue("UserId", userId);

        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }
}
