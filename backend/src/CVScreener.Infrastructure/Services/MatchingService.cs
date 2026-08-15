using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CVScreener.Core;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Helpers;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace CVScreener.Infrastructure.Services;

/// <summary>
/// Orchestrates TF-IDF, Skills, and Experience engines into a single hybrid score,
/// persists results to the analyses table, and prevents duplicate computation via
/// an MD5 hash-based upsert strategy.
///
/// Deduplication key: MD5(clerkId + cleanedCvText + cleanedJdText)
/// On hash match: returns the stored result with IsFromCache = true.
/// On miss: computes all three signals, inserts a new row, returns IsFromCache = false.
///
/// Lifetime: Scoped.
/// </summary>
public sealed class MatchingService : IMatchingService
{
    private readonly IOnnxInferenceService _onnxService;
    private readonly ISkillsEngine _skillsEngine;
    private readonly IExperienceEngine _experienceEngine;
    private readonly IUserRepository _userRepository;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly ILogger<MatchingService> _logger;

    // Score weights — must match Decision Log
    private const double WeightText       = 0.50;
    private const double WeightSkills     = 0.35;
    private const double WeightExperience = 0.15;

    public MatchingService(
        IOnnxInferenceService onnxService,
        ISkillsEngine skillsEngine,
        IExperienceEngine experienceEngine,
        IUserRepository userRepository,
        IDbConnectionFactory dbFactory,
        ILogger<MatchingService> logger)
    {
        _onnxService       = onnxService;
        _skillsEngine      = skillsEngine;
        _experienceEngine  = experienceEngine;
        _userRepository    = userRepository;
        _dbFactory         = dbFactory;
        _logger            = logger;
    }

    /// <inheritdoc />
    public async Task<AnalysisResult> AnalyzeAsync(
        string clerkId,
        string rawCvText,
        string rawJdText,
        string? jobTitle = null,
        CancellationToken cancellationToken = default)
    {
        // ── 1. Resolve DB user (creates the user row if missing) ────────────
        var user = await _userRepository.GetByClerkIdAsync(clerkId);
        if (user is null)
            throw new KeyNotFoundException(
                $"User with Clerk ID '{clerkId}' not found in the database. " +
                "Ensure the user completed onboarding (POST /api/auth/role) before analyzing.");

        // ── 2. Clean inputs ─────────────────────────────────────────────────
        var cleanedCv = TextCleaner.Clean(rawCvText);
        var cleanedJd = TextCleaner.Clean(rawJdText);

        // ── 3. Compute deduplication hash ───────────────────────────────────
        var dedupHash = ComputeMd5Hash(clerkId + cleanedCv + cleanedJd);

        // ── 4. Check for existing cached result ─────────────────────────────
        var cached = await TryGetCachedAsync(dedupHash, clerkId, cancellationToken);
        if (cached is not null)
        {
            _logger.LogInformation("Cache hit for dedup_hash={Hash} (userId={UserId})", dedupHash, user.Id);
            cached.IsFromCache = true;
            return cached;
        }

        _logger.LogInformation("Cache miss — running full analysis for userId={UserId}", user.Id);

        // ── 5. Vectorize ─────────────────────────────────────────────────────
        var cvVector = _onnxService.Vectorize(cleanedCv);
        var jdVector = _onnxService.Vectorize(cleanedJd);
        var textSimilarity = _onnxService.CosineSimilarity(cvVector, jdVector);

        // ── 6. Skills & Experience (pure CPU, run sequentially) ──────────────
        var skillsResult     = _skillsEngine.Analyze(cleanedCv, cleanedJd);
        var experienceResult = _experienceEngine.Analyze(cleanedCv, cleanedJd);

        // ── 7. Hybrid score ───────────────────────────────────────────────────
        var rawScore = WeightText * textSimilarity
                     + WeightSkills * skillsResult.Score
                     + WeightExperience * experienceResult.Score;

        var overallScore = (int)Math.Round(Math.Clamp(rawScore * 100, 0, 100));
        var scoreLabel   = ScoreLabel.FromScore(overallScore);

        _logger.LogInformation(
            "Score for userId={UserId}: overall={Score}, text={T:F4}, skills={S:F4}, exp={E:F4}",
            user.Id, overallScore, textSimilarity, skillsResult.Score, experienceResult.Score);

        // ── 8. Persist to DB (with 23505 race-condition guard) ─────────────────
        AnalysisResult result;
        try
        {
            var analysisId = await InsertAnalysisAsync(
                user.Id, clerkId, rawCvText, rawJdText, jobTitle,
                overallScore, textSimilarity, skillsResult, experienceResult,
                dedupHash, cancellationToken);

            result = new AnalysisResult
            {
                Id              = analysisId,
                JobTitle        = jobTitle,
                CvText          = rawCvText,
                JdText          = rawJdText,
                OverallScore    = overallScore,
                ScoreLabel      = scoreLabel,
                TextSimilarity  = textSimilarity,
                SkillsScore     = skillsResult.Score,
                ExperienceScore = experienceResult.Score,
                Skills          = skillsResult,
                Experience      = experienceResult,
                IsFromCache     = false,
                CreatedAt       = DateTime.UtcNow
            };
        }
        catch (NpgsqlException ex) when (ex.SqlState == "23505") // UniqueViolation on dedup_hash
        {
            // D-07: Two concurrent identical requests raced to INSERT.
            // The other request won — re-query and return the cached result.
            _logger.LogWarning(
                "Dedup hash race condition (23505) for userId={UserId} — re-querying cached result.",
                user.Id);

            var raceCached = await TryGetCachedAsync(dedupHash, clerkId, cancellationToken)
                ?? throw new InvalidOperationException(
                    "23505 UniqueViolation but subsequent TryGetCachedAsync returned null. " +
                    $"dedup_hash={dedupHash}");

            raceCached.IsFromCache = true;
            return raceCached;
        }

        return result;
    }

    // ── DB helpers ────────────────────────────────────────────────────────────

    private async Task<AnalysisResult?> TryGetCachedAsync(
        string dedupHash, string clerkId, CancellationToken ct)
    {
        await using var conn = (NpgsqlConnection)await _dbFactory.OpenConnectionAsync(cancellationToken: ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await SetCurrentClerkIdAsync(conn, tx, clerkId, ct);

        const string sql = """
            SELECT
                id,
                cv_text,
                jd_text,
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
            WHERE dedup_hash = @Hash
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("Hash", dedupHash);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct))
        {
            await reader.DisposeAsync();   // must close reader before committing
            await tx.CommitAsync(ct);
            return null;
        }

        var skillsResult = new SkillsResult
        {
            Matched = JsonbHelper.Deserialize<string[]>(reader["matched_skills"]) ?? [],
            Partial = JsonbHelper.Deserialize<string[]>(reader["partial_skills"]) ?? [],
            Missing = JsonbHelper.Deserialize<string[]>(reader["missing_skills"]) ?? [],
            Score   = reader.GetDouble(reader.GetOrdinal("skills_score"))
        };

        var experienceResult =
            JsonbHelper.Deserialize<ExperienceResult>(reader["experience_data"]) ?? new ExperienceResult
            {
                Score = reader.GetDouble(reader.GetOrdinal("experience_score"))
            };

        var result = new AnalysisResult
        {
            Id              = reader.GetGuid(reader.GetOrdinal("id")),
            JobTitle        = reader.IsDBNull(reader.GetOrdinal("job_title"))
                                  ? null
                                  : reader.GetString(reader.GetOrdinal("job_title")),
            CvText          = reader.GetString(reader.GetOrdinal("cv_text")),
            JdText          = reader.GetString(reader.GetOrdinal("jd_text")),
            OverallScore    = reader.GetInt32(reader.GetOrdinal("overall_score")),
            TextSimilarity  = reader.GetDouble(reader.GetOrdinal("text_similarity")),
            SkillsScore     = skillsResult.Score,
            ExperienceScore = experienceResult.Score,
            Skills          = skillsResult,
            Experience      = experienceResult,
            CreatedAt       = reader.GetDateTime(reader.GetOrdinal("created_at"))
        };

        await reader.DisposeAsync();
        await tx.CommitAsync(ct);

        return result;
    }

    private async Task<Guid> InsertAnalysisAsync(
        Guid userId,
        string clerkId,
        string rawCvText,
        string rawJdText,
        string? jobTitle,
        int overallScore,
        double textSimilarity,
        SkillsResult skills,
        ExperienceResult experience,
        string dedupHash,
        CancellationToken ct)
    {
        await using var conn = (NpgsqlConnection)await _dbFactory.OpenConnectionAsync(cancellationToken: ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await SetCurrentClerkIdAsync(conn, tx, clerkId, ct);

        const string sql = """
            INSERT INTO analyses
                (user_id, cv_text, jd_text, job_title, overall_score, text_similarity,
                 skills_score, experience_score,
                 matched_skills, partial_skills, missing_skills, experience_data,
                 analysis_version, dedup_hash)
            VALUES
                (@UserId, @CvText, @JdText, @JobTitle, @OverallScore, @TextSimilarity,
                 @SkillsScore, @ExperienceScore,
                 @MatchedSkills::jsonb, @PartialSkills::jsonb, @MissingSkills::jsonb, @ExperienceData::jsonb,
                 'v2', @DedupHash)
            RETURNING id;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn, tx);
        cmd.Parameters.AddWithValue("UserId",          userId);
        cmd.Parameters.AddWithValue("CvText",          rawCvText);
        cmd.Parameters.AddWithValue("JdText",          rawJdText);
        cmd.Parameters.AddWithValue("JobTitle",        (object?)jobTitle ?? DBNull.Value);
        cmd.Parameters.AddWithValue("OverallScore",    overallScore);
        cmd.Parameters.AddWithValue("TextSimilarity",  textSimilarity);
        cmd.Parameters.AddWithValue("SkillsScore",     skills.Score);
        cmd.Parameters.AddWithValue("ExperienceScore", experience.Score);
        cmd.Parameters.AddWithValue("MatchedSkills",   JsonSerializer.Serialize(skills.Matched));
        cmd.Parameters.AddWithValue("PartialSkills",   JsonSerializer.Serialize(skills.Partial));
        cmd.Parameters.AddWithValue("MissingSkills",   JsonSerializer.Serialize(skills.Missing));
        cmd.Parameters.AddWithValue("ExperienceData",  JsonSerializer.Serialize(experience));
        cmd.Parameters.AddWithValue("DedupHash",       dedupHash);

        var result = await cmd.ExecuteScalarAsync(ct);
        await tx.CommitAsync(ct);
        return (Guid)(result ?? throw new InvalidOperationException("INSERT did not return an ID."));
    }

    // ── Static helpers ────────────────────────────────────────────────────────

    internal static string ComputeMd5Hash(string input)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
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
