using CVScreener.Core.Interfaces;
using Npgsql;
using Testcontainers.PostgreSql;

namespace CVScreener.Tests;

public sealed class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        ConnectionString = _container.GetConnectionString();

        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();

        await using (var extensionCmd = new NpgsqlCommand("CREATE EXTENSION IF NOT EXISTS pgcrypto;", conn))
            await extensionCmd.ExecuteNonQueryAsync();

        var initSqlPath = Path.GetFullPath(
            Path.Combine(AppContext.BaseDirectory, "../../../../../database/init.sql"));
        var initSql = await File.ReadAllTextAsync(initSqlPath);

        await using var cmd = new NpgsqlCommand(initSql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}

internal sealed class TestDbConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public TestDbConnectionFactory(string connectionString)
    {
        _connectionString = connectionString;
    }

    public System.Data.IDbConnection CreateConnection() => new NpgsqlConnection(_connectionString);

    public async Task<System.Data.IDbConnection> OpenConnectionAsync(
        int maxAttempts = 3,
        CancellationToken cancellationToken = default)
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    // Named connections (e.g. "share") use the same test container connection —
    // no separate role is created in the test environment.
    public async Task<System.Data.IDbConnection> OpenConnectionAsync(
        string connectionName,
        int maxAttempts = 3,
        CancellationToken cancellationToken = default)
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }
}
