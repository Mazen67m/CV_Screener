using System.Text.Json.Serialization;

namespace CVScreener.API.DTOs.Jd;

public class JdValidateResponse
{
    [JsonPropertyName("cleaned_text")]
    public string CleanedText { get; set; } = string.Empty;

    [JsonPropertyName("word_count")]
    public int WordCount { get; set; }

    [JsonPropertyName("valid")]
    public bool Valid { get; set; }
}
