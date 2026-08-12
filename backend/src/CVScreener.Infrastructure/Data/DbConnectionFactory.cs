using System.Data;
using CVScreener.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System.Net.Sockets;

namespace CVScreener.Infrastructure.Data;

public class DbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;
    private readonly IConfiguration _config;

    public DbConnectionFactory(IConfiguration config)
    {
        _config = config;
        var cs = config.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection is missing or empty. " +
                "Ensure the CONNECTIONSTRINGS__DEFAULTCONNECTION environment variable (or .env file) is set.");
        _connectionString = cs;
    }

    public IDbConnection CreateConnection()
    {
        return new NpgsqlConnection(_connectionString);
    }

    /// <summary>
    /// Opens a connection with up to <paramref name="maxAttempts"/> retries for transient
    /// socket / DNS failures from the Supabase connection pooler (SocketException 11004).
    /// </summary>
    public async Task<IDbConnection> OpenConnectionAsync(
        int maxAttempts = 3,
        CancellationToken cancellationToken = default)
    {
        return await OpenConnectionWithRetryAsync(_connectionString, maxAttempts, cancellationToken);
    }

    public async Task<IDbConnection> OpenConnectionAsync(
        string connectionName,
        int maxAttempts = 3,
        CancellationToken cancellationToken = default)
    {
        var connectionString = connectionName switch
        {
            "share" => _config.GetConnectionString("ShareConnection")
                ?? _config["DB_SHARE_CONNECTION_STRING"],
            _ => _connectionString
        };

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException(
                $"Connection string for named connection '{connectionName}' is missing or empty.");

        return await OpenConnectionWithRetryAsync(connectionString, maxAttempts, cancellationToken);
    }

    private static async Task<IDbConnection> OpenConnectionWithRetryAsync(
        string connectionString,
        int maxAttempts,
        CancellationToken cancellationToken)
    {
        var delayMs = 500;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var conn = new NpgsqlConnection(connectionString);
            try
            {
                await conn.OpenAsync(cancellationToken);
                return conn;
            }
            catch (Exception ex) when (
                attempt < maxAttempts &&
                (ex is SocketException || ex is NpgsqlException { IsTransient: true }))
            {
                await conn.DisposeAsync();
                await Task.Delay(delayMs * attempt, cancellationToken);
            }
            catch
            {
                await conn.DisposeAsync();
                throw;
            }
        }
        // Unreachable — kept to satisfy the compiler.
        throw new InvalidOperationException("OpenConnectionAsync exhausted all retries.");
    }
}
