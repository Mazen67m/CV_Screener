using CVScreener.Core.Entities;
using CVScreener.Core.Interfaces;
using Npgsql;

namespace CVScreener.Infrastructure.Repositories;

/// <summary>
/// Persists and retrieves extended user profile data in the user_profiles table.
/// Uses ON CONFLICT (user_id) DO UPDATE — safe to call on every POST /api/auth/role.
/// </summary>
public sealed class UserProfileRepository : IUserProfileRepository
{
    private readonly IDbConnectionFactory _dbFactory;

    public UserProfileRepository(IDbConnectionFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task UpsertAsync(UserProfile profile, CancellationToken ct = default)
    {
        await using var conn = (NpgsqlConnection)await _dbFactory.OpenConnectionAsync(cancellationToken: ct);

        const string sql = """
            INSERT INTO user_profiles
                (user_id, target_role, experience_level, years_of_experience, preferred_industries,
                 company_name, industry, company_size, hiring_roles, updated_at)
            VALUES
                (@UserId, @TargetRole, @ExperienceLevel, @YearsOfExperience, @PreferredIndustries,
                 @CompanyName, @Industry, @CompanySize, @HiringRoles, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                target_role           = EXCLUDED.target_role,
                experience_level      = EXCLUDED.experience_level,
                years_of_experience   = EXCLUDED.years_of_experience,
                preferred_industries  = EXCLUDED.preferred_industries,
                company_name          = EXCLUDED.company_name,
                industry              = EXCLUDED.industry,
                company_size          = EXCLUDED.company_size,
                hiring_roles          = EXCLUDED.hiring_roles,
                updated_at            = NOW();
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("UserId",               profile.UserId);
        cmd.Parameters.AddWithValue("TargetRole",           (object?)profile.TargetRole          ?? DBNull.Value);
        cmd.Parameters.AddWithValue("ExperienceLevel",      (object?)profile.ExperienceLevel     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("YearsOfExperience",    (object?)profile.YearsOfExperience   ?? DBNull.Value);
        cmd.Parameters.AddWithValue("PreferredIndustries",  (object?)profile.PreferredIndustries ?? DBNull.Value);
        cmd.Parameters.AddWithValue("CompanyName",          (object?)profile.CompanyName         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("Industry",             (object?)profile.Industry            ?? DBNull.Value);
        cmd.Parameters.AddWithValue("CompanySize",          (object?)profile.CompanySize         ?? DBNull.Value);
        cmd.Parameters.AddWithValue("HiringRoles",          (object?)profile.HiringRoles         ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<UserProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        await using var conn = (NpgsqlConnection)await _dbFactory.OpenConnectionAsync(cancellationToken: ct);

        const string sql = """
            SELECT id, user_id, target_role, experience_level, years_of_experience,
                   preferred_industries, company_name, industry, company_size, hiring_roles
            FROM user_profiles
            WHERE user_id = @UserId
            LIMIT 1;
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("UserId", userId);
        await using var reader = await cmd.ExecuteReaderAsync(ct);

        if (!await reader.ReadAsync(ct))
            return null;

        return new UserProfile
        {
            Id                  = reader.GetGuid(reader.GetOrdinal("id")),
            UserId              = reader.GetGuid(reader.GetOrdinal("user_id")),
            TargetRole          = reader.IsDBNull(reader.GetOrdinal("target_role"))          ? null : reader.GetString(reader.GetOrdinal("target_role")),
            ExperienceLevel     = reader.IsDBNull(reader.GetOrdinal("experience_level"))     ? null : reader.GetString(reader.GetOrdinal("experience_level")),
            YearsOfExperience   = reader.IsDBNull(reader.GetOrdinal("years_of_experience"))  ? null : reader.GetString(reader.GetOrdinal("years_of_experience")),
            PreferredIndustries = reader.IsDBNull(reader.GetOrdinal("preferred_industries")) ? null : reader.GetString(reader.GetOrdinal("preferred_industries")),
            CompanyName         = reader.IsDBNull(reader.GetOrdinal("company_name"))         ? null : reader.GetString(reader.GetOrdinal("company_name")),
            Industry            = reader.IsDBNull(reader.GetOrdinal("industry"))             ? null : reader.GetString(reader.GetOrdinal("industry")),
            CompanySize         = reader.IsDBNull(reader.GetOrdinal("company_size"))         ? null : reader.GetString(reader.GetOrdinal("company_size")),
            HiringRoles         = reader.IsDBNull(reader.GetOrdinal("hiring_roles"))         ? null : reader.GetString(reader.GetOrdinal("hiring_roles")),
        };
    }
}
