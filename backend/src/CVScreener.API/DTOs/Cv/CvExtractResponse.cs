using System.Text.Json.Serialization;

namespace CVScreener.API.DTOs.Cv;

public class CvExtractResponse
{
    [JsonPropertyName("extracted_text")]
    public string ExtractedText { get; set; } = string.Empty;

    [JsonPropertyName("word_count")]
    public int WordCount { get; set; }

    [JsonPropertyName("extraction_success")]
    public bool ExtractionSuccess { get; set; }
}
