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
        _connectionString = ConvertIfUri(cs);
    }

    /// <summary>
    /// Converts a PostgreSQL URI (postgresql://user:pass@host/db?params) to
    /// an ADO.NET key-value connection string that Npgsql understands.
    /// If the input is already in key-value format, returns it unchanged.
    /// </summary>
    private static string ConvertIfUri(string connectionString)
    {
        if (!connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase) &&
            !connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
            return connectionString;

        var uri = new Uri(connectionString);
        var userInfo = uri.UserInfo.Split(':', 2);
        var username = Uri.UnescapeDataString(userInfo[0]);
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 5432;
        var database = uri.AbsolutePath.TrimStart('/');

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = port,
            Database = database,
            Username = username,
            Password = password,
        };

        // Parse query parameters (e.g. sslmode=require)
        var query = uri.Query.TrimStart('?');
        if (!string.IsNullOrEmpty(query))
        {
            foreach (var param in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = param.Split('=', 2);
                if (kv.Length != 2) continue;
                var key = Uri.UnescapeDataString(kv[0]).ToLowerInvariant();
                var value = Uri.UnescapeDataString(kv[1]);
                switch (key)
                {
                    case "sslmode":
                        builder.SslMode = value.ToLowerInvariant() switch
                        {
                            "require" => SslMode.Require,
                            "prefer" => SslMode.Prefer,
                            "disable" => SslMode.Disable,
                            "verify-ca" => SslMode.VerifyCA,
                            "verify-full" => SslMode.VerifyFull,
                            _ => SslMode.Prefer,
                        };
                        break;
                    case "channel_binding":
                        // Npgsql 8+ supports Channel Binding
                        builder["Channel Binding"] = value;
                        break;
                    default:
                        try { builder[key] = value; }
                        catch { /* skip unknown parameters */ }
                        break;
                }
            }
        }

        // Trust server certificate for cloud-hosted PostgreSQL
        builder.TrustServerCertificate = true;

        return builder.ConnectionString;
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

        return await OpenConnectionWithRetryAsync(ConvertIfUri(connectionString), maxAttempts, cancellationToken);
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
