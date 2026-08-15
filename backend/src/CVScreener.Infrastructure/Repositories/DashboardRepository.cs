using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Npgsql;

namespace CVScreener.Infrastructure.Repositories;

/// <summary>
/// Computes aggregated dashboard metrics for a user via SQL.
///
/// Metrics computed:
///   - total_analyses  : COUNT of all analyses
///   - average_score   : AVG(overall_score) rounded to nearest int
///   - best_score      : MAX(overall_score)
///   - most_missing    : Top 5 skills from JSONB unnest of missing_skills, by frequency
///
/// All queries are scoped to the user via clerk_id → users.id join.
/// Uses the app DB role (not the share role) so RLS applies normally.
/// </summary>
public sealed class DashboardRepository : IDashboardRepository
{
    private readonly IDbConnectionFactory _dbFactory;

    public DashboardRepository(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<DashboardMetrics> GetMetricsAsync(string clerkId, CancellationToken ct = default)
    {
        await using var conn = (NpgsqlConnection)await _dbFactory.OpenConnectionAsync(cancellationToken: ct);
        await using var tx = await conn.BeginTransactionAsync(ct);
        await SetCurrentClerkIdAsync(conn, tx, clerkId, ct);

        // ── 1. Aggregate totals ────────────────────────────────────────────────
        const string aggregateSql = """
            SELECT
                COUNT(*)::int                 AS total_analyses,
                ROUND(AVG(overall_score))::int AS average_score,
                MAX(overall_score)::int        AS best_score
            FROM analyses a
            INNER JOIN users u ON u.id = a.user_id
            WHERE u.clerk_id = @ClerkId;
            """;

        int totalAnalyses = 0;
        int? averageScore = null;
        int? bestScore    = null;

        await using (var cmd = new NpgsqlCommand(aggregateSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("ClerkId", clerkId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            if (await reader.ReadAsync(ct))
            {
                totalAnalyses = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
                averageScore  = reader.IsDBNull(1) ? null : reader.GetInt32(1);
                bestScore     = reader.IsDBNull(2) ? null : reader.GetInt32(2);
            }
        }

        // ── 2. Most missing skills (JSONB unnest + frequency rank) ─────────────
        const string missingSkillsSql = """
            SELECT skill, COUNT(*) AS freq
            FROM analyses a
            INNER JOIN users u ON u.id = a.user_id,
            jsonb_array_elements_text(a.missing_skills) AS skill
            WHERE u.clerk_id = @ClerkId
            GROUP BY skill
            ORDER BY freq DESC
            LIMIT 5;
            """;

        var mostMissing = new List<string>();
        await using (var cmd = new NpgsqlCommand(missingSkillsSql, conn, tx))
        {
            cmd.Parameters.AddWithValue("ClerkId", clerkId);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
                mostMissing.Add(reader.GetString(0));
        }

        await tx.CommitAsync(ct);

        return new DashboardMetrics(
            TotalAnalyses:    totalAnalyses,
            AverageScore:     totalAnalyses == 0 ? null : averageScore,
            BestScore:        totalAnalyses == 0 ? null : bestScore,
            MostMissingSkills: mostMissing);
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
