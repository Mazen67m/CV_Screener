using CVScreener.Core.Entities;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Dapper;

namespace CVScreener.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public UserRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<User?> GetByClerkIdAsync(string clerkId)
    {
        using var connection = await _connectionFactory.OpenConnectionAsync();
        const string query = "SELECT id, clerk_id AS ClerkId, email, role, created_at AS CreatedAt FROM users WHERE clerk_id = @ClerkId;";
        return await connection.QueryFirstOrDefaultAsync<User>(query, new { ClerkId = clerkId });
    }

    public async Task UpsertAsync(User user)
    {
        using var connection = await _connectionFactory.OpenConnectionAsync();
        const string query = @"
            INSERT INTO users (clerk_id, email, created_at)
            VALUES (@ClerkId, @Email, NOW())
            ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email;";
        await connection.ExecuteAsync(query, new { ClerkId = user.ClerkId, Email = user.Email });
    }

    public async Task SetRoleAsync(string clerkId, string role)
    {
        using var connection = await _connectionFactory.OpenConnectionAsync();

        // Atomic single-query update: only succeeds if role IS NULL.
        // This eliminates the TOCTOU race between a separate SELECT and UPDATE.
        const string updateQuery =
            "UPDATE users SET role = @Role WHERE clerk_id = @ClerkId AND role IS NULL;";

        var rowsAffected = await connection.ExecuteAsync(
            updateQuery, new { ClerkId = clerkId, Role = role });

        if (rowsAffected > 0)
        {
            // Happy path — role was not set before; update succeeded.
            return;
        }

        // Zero rows affected: either the user doesn't exist, or the role was already set.
        // Run one follow-up query only in this failure path to give the correct exception.
        const string checkQuery = "SELECT role FROM users WHERE clerk_id = @ClerkId;";
        var existingRole = await connection.QueryFirstOrDefaultAsync<string?>(
            checkQuery, new { ClerkId = clerkId });

        if (existingRole != null)
        {
            throw new RoleAlreadySetException();
        }

        throw new KeyNotFoundException($"User with ClerkId '{clerkId}' not found.");
    }
}
