using System.Data;

namespace CVScreener.Core.Interfaces;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();

    /// <summary>
    /// Opens a new connection with automatic retry for transient failures
    /// (e.g. SocketException 11004 from the Supabase connection pooler).
    /// </summary>
    Task<IDbConnection> OpenConnectionAsync(
        int maxAttempts = 3,
        CancellationToken cancellationToken = default);
}
