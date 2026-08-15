using System.ComponentModel.DataAnnotations;

namespace CVScreener.API.DTOs.Auth;

/// <summary>
/// Request body for POST /api/auth/role.
/// Role is required. All profile fields are optional — they are persisted
/// to user_profiles (DEC-019 / F-13) but are not required to complete onboarding.
/// </summary>
public class SetRoleRequest
{
    [Required(ErrorMessage = "Role is required.")]
    [RegularExpression("^(job_seeker|recruiter)$", ErrorMessage = "Role must be 'job_seeker' or 'recruiter'.")]
    public string Role { get; set; } = string.Empty;

    // ── Job Seeker profile fields ─────────────────────────────────────────────
    public string? TargetRole           { get; set; }
    public string? ExperienceLevel      { get; set; }
    public string? YearsOfExperience    { get; set; }
    public string? PreferredIndustries  { get; set; }

    // ── Recruiter profile fields ──────────────────────────────────────────────
    public string? CompanyName          { get; set; }
    public string? Industry             { get; set; }
    public string? CompanySize          { get; set; }
    public string? HiringRoles          { get; set; }
}
