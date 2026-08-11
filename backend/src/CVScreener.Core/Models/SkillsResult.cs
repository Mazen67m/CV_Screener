namespace CVScreener.Core.Models;

/// <summary>
/// Output of ISkillsEngine.Analyze().
/// All arrays contain canonical skill names (e.g., "Kubernetes", not "k8s").
/// </summary>
public class SkillsResult
{
    /// <summary>
    /// Skills required by the JD where the canonical form was found in the CV.
    /// These count fully toward the skills score.
    /// </summary>
    public string[] Matched { get; set; } = [];

    /// <summary>
    /// Skills required by the JD where only an alias was found in the CV (not the canonical form).
    /// These count as 0.5 toward the skills score.
    /// </summary>
    public string[] Partial { get; set; } = [];

    /// <summary>
    /// Skills required by the JD but not found anywhere in the CV.
    /// These contribute 0 toward the skills score.
    /// </summary>
    public string[] Missing { get; set; } = [];

    /// <summary>
    /// Normalised score in [0, 1].
    /// Formula: (Matched.Length + 0.5 * Partial.Length) / Max(RequiredTotal, 1)
    /// </summary>
    public double Score { get; set; }
}
