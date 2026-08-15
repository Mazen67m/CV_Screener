namespace CVScreener.Core.Entities;

/// <summary>
/// Extended profile for a user, persisted in the user_profiles table.
/// One-to-one with users(id). Fields differ by role:
///   Job Seeker: TargetRole, ExperienceLevel, YearsOfExperience, PreferredIndustries
///   Recruiter:  CompanyName, Industry, CompanySize, HiringRoles
/// All fields are optional — the minimum required is just the role (stored in users table).
/// </summary>
public class UserProfile
{
    public Guid    Id                   { get; set; }
    public Guid    UserId               { get; set; }

    // ── Job Seeker fields ────────────────────────────────────────────────────
    public string? TargetRole           { get; set; }
    public string? ExperienceLevel      { get; set; }
    public string? YearsOfExperience    { get; set; }
    public string? PreferredIndustries  { get; set; }

    // ── Recruiter fields ─────────────────────────────────────────────────────
    public string? CompanyName          { get; set; }
    public string? Industry             { get; set; }
    public string? CompanySize          { get; set; }
    public string? HiringRoles          { get; set; }
}
