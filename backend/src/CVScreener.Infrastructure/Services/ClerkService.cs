using System.Net.Http.Headers;
using System.Net.Http.Json;
using CVScreener.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CVScreener.Infrastructure.Services;

public class ClerkService : IClerkService
{
    private const string ClerkApiBase = "https://api.clerk.com/v1";

    private readonly HttpClient _httpClient;
    private readonly ILogger<ClerkService> _logger;
    private readonly bool _isConfigured;

    public ClerkService(HttpClient httpClient, IConfiguration config, ILogger<ClerkService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var secretKey =
            (string.IsNullOrWhiteSpace(config["Clerk:SecretKey"]) ? null : config["Clerk:SecretKey"])
            ?? (string.IsNullOrWhiteSpace(config["CLERK__SECRET_KEY"]) ? null : config["CLERK__SECRET_KEY"]);

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            _isConfigured = false;
            _logger.LogWarning(
                "Clerk secret key is not configured. Role metadata sync will be skipped.");
            return;
        }

        _isConfigured = true;

        // Set Bearer token once for the lifetime of this typed client.
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", secretKey);
    }

    /// <inheritdoc/>
    public async Task UpdatePublicMetadataAsync(string clerkId, object metadata)
    {
        if (!_isConfigured)
        {
            _logger.LogWarning(
                "Skipping Clerk metadata update for user {ClerkId} because Clerk secret key is not configured.",
                clerkId);
            return;
        }

        // Clerk PATCH /v1/users/{userId}/metadata merges; it does NOT overwrite
        // keys that are absent from the request body.
        var url = $"{ClerkApiBase}/users/{clerkId}/metadata";

        var payload = new { public_metadata = metadata };

        using var response = await _httpClient.PatchAsJsonAsync(url, payload);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Clerk metadata update failed for user {ClerkId}. " +
                "Status: {Status}. Body: {Body}",
                clerkId, response.StatusCode, body);

            // Propagate — the controller will catch and return 500.
            response.EnsureSuccessStatusCode();
        }
    }
}
