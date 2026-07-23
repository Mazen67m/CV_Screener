using System.ComponentModel.DataAnnotations;

namespace CVScreener.API.DTOs.Auth;

public class SetRoleRequest
{
    [Required(ErrorMessage = "Role is required.")]
    [RegularExpression("^(job_seeker|recruiter)$", ErrorMessage = "Role must be 'job_seeker' or 'recruiter'.")]
    public string Role { get; set; } = string.Empty;
}
