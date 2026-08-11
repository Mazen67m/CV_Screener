using System.Text.Json;

namespace CVScreener.Infrastructure.Helpers;

internal static class JsonbHelper
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true
    };

    internal static T? Deserialize<T>(object value)
    {
        if (value is DBNull || value is null)
            return default;

        var json = value.ToString();
        if (string.IsNullOrWhiteSpace(json))
            return default;

        return JsonSerializer.Deserialize<T>(json, Options);
    }
}
