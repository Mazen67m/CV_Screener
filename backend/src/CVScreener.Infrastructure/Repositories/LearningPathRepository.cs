using CVScreener.Core.Interfaces;
using Npgsql;

namespace CVScreener.Infrastructure.Repositories;

/// <summary>
/// Returns missing skills for a specific analysis, ordered by how frequently
/// each skill appears across ALL of the user's analyses (most commonly missed first).
///
/// This ordering helps the frontend's LearningPathSection surface the most impactful
/// skills to learn — not just the ones missing from this analysis, but the ones
/// the user consistently lacks across multiple job applications.
///
/// Ownership is enforced: the analysis must belong to the requesting clerk user.
/// Returns an empty list (not 404) if analysis is not found or belongs to another user.
/// </summary>
public sealed class LearningPathRepository : ILearningPathRepository
{
    private readonly IDbConnectionFactory _dbFactory;

    public LearningPathRepository(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<IReadOnlyList<string>> GetSortedMissingSkillsAsync(
        Guid analysisId,
        string clerkId,
        CancellationToken ct = default)
    {
        await using var conn = (NpgsqlConnection)await _dbFactory.OpenConnectionAsync(cancellationToken: ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await SetCurrentClerkIdAsync(conn, tx, clerkId, ct);

        // Step 1: Get missing_skills for this specific analysis (ownership-checked)
        const string missingForAnalysisSql = """
            SELECT a.missing_skills
            FROM analyses a
            INNER JOIN users u ON u.id = a.user_id
            WHERE a.id = @AnalysisId
              AND u.clerk_id = @ClerkId
            LIMIT 1;
            """;

        string? missingJson;
        await using (var cmd = new NpgsqlCommand(missingForAnalysisSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("AnalysisId", analysisId);
            cmd.Parameters.AddWithValue("ClerkId", clerkId);
            var raw = await cmd.ExecuteScalarAsync(ct);
            if (raw is null or DBNull)
            {
                await tx.CommitAsync(ct);
                return [];
            }
            missingJson = raw.ToString();
        }

        if (string.IsNullOrWhiteSpace(missingJson) || missingJson == "[]")
        {
            await tx.CommitAsync(ct);
            return [];
        }

        // Step 2: Rank those specific missing skills by frequency across all user analyses
        const string rankSql = """
            SELECT skill, COUNT(*) AS freq
            FROM analyses a
            INNER JOIN users u ON u.id = a.user_id,
            jsonb_array_elements_text(a.missing_skills) AS skill
            WHERE u.clerk_id = @ClerkId
              AND skill = ANY(@Skills)
            GROUP BY skill
            ORDER BY freq DESC;
            """;

        // Parse skill names from the analysis's missing_skills JSON
        var skills = System.Text.Json.JsonSerializer.Deserialize<string[]>(missingJson) ?? [];
        if (skills.Length == 0)
        {
            await tx.CommitAsync(ct);
            return [];
        }

        var ranked = new List<string>();
        await using (var cmd = new NpgsqlCommand(rankSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("ClerkId", clerkId);
            cmd.Parameters.Add(new NpgsqlParameter<string[]>("Skills", skills));
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
                ranked.Add(reader.GetString(0));
        }

        // Append any skills that didn't appear in other analyses (freq=0 won't be in ranked)
        foreach (var s in skills)
        {
            if (!ranked.Contains(s, StringComparer.OrdinalIgnoreCase))
                ranked.Add(s);
        }

        await tx.CommitAsync(ct);
        return ranked;
    }

    private static async Task SetCurrentClerkIdAsync(
        NpgsqlConnection conn,
        NpgsqlTransaction tx,
        string clerkId,
        CancellationToken ct)
    {
        await using var setCmd = new NpgsqlCommand(
            "SELECT set_config('app.current_clerk_id', @ClerkId, true);",
            conn, tx);
        setCmd.Parameters.AddWithValue("ClerkId", clerkId);
        await setCmd.ExecuteNonQueryAsync(ct);
    }
}
