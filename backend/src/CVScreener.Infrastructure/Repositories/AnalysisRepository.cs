using CVScreener.Core;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Helpers;
using Npgsql;

namespace CVScreener.Infrastructure.Repositories;

public sealed class AnalysisRepository : IAnalysisRepository
{
    private readonly IDbConnectionFactory _dbFactory;

    public AnalysisRepository(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<IReadOnlyList<AnalysisHistoryItem>> GetHistoryAsync(
        string clerkId,
        int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveLimit = Math.Clamp(limit ?? AppLimits.HistoryLimit, 1, AppLimits.HistoryLimit);

        await using var conn = (NpgsqlConnection)
            await _dbFactory.OpenConnectionAsync(cancellationToken: cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await SetCurrentClerkIdAsync(conn, tx, clerkId, cancellationToken);

        const string sql = """
            SELECT
                a.id,
                a.job_title,
                a.overall_score,
                a.matched_skills,
                a.partial_skills,
                a.missing_skills,
                a.created_at
            FROM analyses a
            INNER JOIN users u ON u.id = a.user_id
            WHERE u.clerk_id = @ClerkId
            ORDER BY a.created_at DESC
            LIMIT @Limit;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("ClerkId", clerkId);
        cmd.Parameters.AddWithValue("Limit", effectiveLimit);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var results = new List<AnalysisHistoryItem>();

        while (await reader.ReadAsync(cancellationToken))
        {
            var matched = JsonbHelper.Deserialize<string[]>(reader["matched_skills"]) ?? [];
            var partial = JsonbHelper.Deserialize<string[]>(reader["partial_skills"]) ?? [];
            var missing = JsonbHelper.Deserialize<string[]>(reader["missing_skills"]) ?? [];

            results.Add(new AnalysisHistoryItem
            {
                Id = reader.GetGuid(reader.GetOrdinal("id")),
                JobTitle = reader.IsDBNull(reader.GetOrdinal("job_title"))
                    ? null
                    : reader.GetString(reader.GetOrdinal("job_title")),
                OverallScore = reader.GetInt32(reader.GetOrdinal("overall_score")),
                MatchedSkillsCount = matched.Length + partial.Length,
                MissingSkillsCount = missing.Length,
                CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
            });
        }

        await reader.DisposeAsync();
        await tx.CommitAsync(cancellationToken);

        return results;
    }

    public async Task<AnalysisResult?> GetByIdAsync(
        Guid id,
        string clerkId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = (NpgsqlConnection)
            await _dbFactory.OpenConnectionAsync(cancellationToken: cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);
        await SetCurrentClerkIdAsync(conn, tx, clerkId, cancellationToken);

        const string sql = """
            SELECT
                a.id,
                a.job_title,
                a.cv_text,
                a.jd_text,
                a.overall_score,
                a.text_similarity,
                a.skills_score,
                a.experience_score,
                a.matched_skills,
                a.partial_skills,
                a.missing_skills,
                a.experience_data,
                a.created_at,
                u.clerk_id AS owner_clerk_id
            FROM analyses a
            INNER JOIN users u ON u.id = a.user_id
            WHERE a.id = @Id
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("Id", id);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            await reader.DisposeAsync();   // must close reader before committing
            await tx.CommitAsync(cancellationToken);
            return null;
        }

        var ownerClerkId = reader.GetString(reader.GetOrdinal("owner_clerk_id"));
        if (!string.Equals(ownerClerkId, clerkId, StringComparison.Ordinal))
            throw new UnauthorizedAccessException();

        var skills = new SkillsResult
        {
            Matched = JsonbHelper.Deserialize<string[]>(reader["matched_skills"]) ?? [],
            Partial = JsonbHelper.Deserialize<string[]>(reader["partial_skills"]) ?? [],
            Missing = JsonbHelper.Deserialize<string[]>(reader["missing_skills"]) ?? [],
            Score = reader.GetDouble(reader.GetOrdinal("skills_score"))
        };

        var experience = JsonbHelper.Deserialize<ExperienceResult>(reader["experience_data"])
            ?? new ExperienceResult
            {
                Score = reader.GetDouble(reader.GetOrdinal("experience_score"))
            };

        var result = new AnalysisResult
        {
            Id = reader.GetGuid(reader.GetOrdinal("id")),
            JobTitle = reader.IsDBNull(reader.GetOrdinal("job_title"))
                ? null
                : reader.GetString(reader.GetOrdinal("job_title")),
            CvText = reader.GetString(reader.GetOrdinal("cv_text")),
            JdText = reader.GetString(reader.GetOrdinal("jd_text")),
            OverallScore = reader.GetInt32(reader.GetOrdinal("overall_score")),
            TextSimilarity = reader.GetDouble(reader.GetOrdinal("text_similarity")),
            SkillsScore = skills.Score,
            ExperienceScore = reader.GetDouble(reader.GetOrdinal("experience_score")),
            Skills = skills,
            Experience = experience,
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };

        await reader.DisposeAsync();
        await tx.CommitAsync(cancellationToken);

        return result;
    }

    public async Task<AnalysisResult?> GetByIdPublicAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        await using var conn = (NpgsqlConnection)
            await _dbFactory.OpenConnectionAsync("share", cancellationToken: cancellationToken);

        const string sql = """
            SELECT
                id,
                job_title,
                overall_score,
                text_similarity,
                skills_score,
                experience_score,
                matched_skills,
                partial_skills,
                missing_skills,
                experience_data,
                created_at
            FROM analyses
            WHERE id = @Id
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("Id", id);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var skills = new SkillsResult
        {
            Matched = JsonbHelper.Deserialize<string[]>(reader["matched_skills"]) ?? [],
            Partial = JsonbHelper.Deserialize<string[]>(reader["partial_skills"]) ?? [],
            Missing = JsonbHelper.Deserialize<string[]>(reader["missing_skills"]) ?? [],
            Score = reader.GetDouble(reader.GetOrdinal("skills_score"))
        };

        var experience = JsonbHelper.Deserialize<ExperienceResult>(reader["experience_data"])
            ?? new ExperienceResult
            {
                Score = reader.GetDouble(reader.GetOrdinal("experience_score"))
            };

        return new AnalysisResult
        {
            Id = reader.GetGuid(reader.GetOrdinal("id")),
            JobTitle = reader.IsDBNull(reader.GetOrdinal("job_title"))
                ? null
                : reader.GetString(reader.GetOrdinal("job_title")),
            CvText = string.Empty,
            JdText = string.Empty,
            OverallScore = reader.GetInt32(reader.GetOrdinal("overall_score")),
            TextSimilarity = reader.GetDouble(reader.GetOrdinal("text_similarity")),
            SkillsScore = skills.Score,
            ExperienceScore = reader.GetDouble(reader.GetOrdinal("experience_score")),
            Skills = skills,
            Experience = experience,
            CreatedAt = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };
    }

    private static async Task SetCurrentClerkIdAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        string clerkId,
        CancellationToken cancellationToken)
    {
        await using var setCmd = new NpgsqlCommand(
            "SELECT set_config('app.current_clerk_id', @ClerkId, true);",
            conn,
            tx);
        setCmd.Parameters.AddWithValue("ClerkId", clerkId);
        await setCmd.ExecuteNonQueryAsync(cancellationToken);
    }
}
