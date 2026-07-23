using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace CVScreener.API.DTOs.Cv;

public class CvExtractRequest
{
    [Required(ErrorMessage = "File is required.")]
    public IFormFile File { get; set; } = null!;
}
