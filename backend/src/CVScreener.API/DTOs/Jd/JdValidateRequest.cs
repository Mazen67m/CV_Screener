using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CVScreener.API.DTOs.Jd;

public class JdValidateRequest
{
    [Required]
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}
