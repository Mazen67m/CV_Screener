using System.Text.Json;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Helpers;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CVScreener.Infrastructure.Services;

/// <summary>
/// Loads skills_taxonomy.json once at startup, then classifies skills
/// for any CV/JD pair on demand.
///
/// Classification rules (per skill in taxonomy):
///   1. If canonical form found in JD  → the skill is "required"
///      OR if any alias found in JD    → the skill is "required"
///   2. For each required skill:
///      a. canonical found in CV       → Matched   (counts as 1.0)
///      b. any alias found in CV       → Partial   (counts as 0.5)
///      c. neither                      → Missing   (counts as 0.0)
///   Score = (Matched + 0.5 × Partial) / Max(TotalRequired, 1)
///
/// Thread-safe: all fields are read-only after construction.
/// </summary>
public sealed class SkillsEngine : ISkillsEngine
{
    private readonly IReadOnlyList<SkillEntry> _taxonomy;
    private readonly ILogger<SkillsEngine> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public SkillsEngine(IOptions<SkillsEngineOptions> options, ILogger<SkillsEngine> logger)
    {
        _logger = logger;
        var opts = options.Value;

        var path = ResolvePath(opts.TaxonomyPath);
        if (!File.Exists(path))
            throw new FileNotFoundException(
                $"Skills taxonomy file not found for setting '{SkillsEngineOptions.SectionName}:TaxonomyPath': '{path}'. " +
                "Ensure ml/skills_taxonomy.json exists in the repository.",
                path);

        var json = File.ReadAllText(path);
        _taxonomy = JsonSerializer.Deserialize<List<SkillEntry>>(json, JsonOpts)
                    ?? throw new InvalidOperationException("skills_taxonomy.json is empty or invalid.");

        _logger.LogInformation("SkillsEngine loaded {Count} canonical skills from {Path}.",
            _taxonomy.Count, path);
    }

    /// <inheritdoc />
    public SkillsResult Analyze(string cleanedCv, string cleanedJd)
    {
        var matched = new List<string>();
        var partial = new List<string>();
        var missing = new List<string>();

        foreach (var entry in _taxonomy)
        {
            // ── Step 1: Is this skill required by the JD? ────────────────────
            bool requiredByJd =
                ContainsIgnoreCase(cleanedJd, entry.Canonical) ||
                entry.Aliases.Any(alias => ContainsIgnoreCase(cleanedJd, alias));

            if (!requiredByJd)
                continue;

            // ── Step 2: Classify this skill against the CV ───────────────────
            if (ContainsIgnoreCase(cleanedCv, entry.Canonical))
            {
                matched.Add(entry.Canonical);
            }
            else if (entry.Aliases.Any(alias => ContainsIgnoreCase(cleanedCv, alias)))
            {
                partial.Add(entry.Canonical);
            }
            else
            {
                missing.Add(entry.Canonical);
            }
        }

        int totalRequired = matched.Count + partial.Count + missing.Count;
        double score = totalRequired == 0
            ? 0.0
            : (matched.Count + 0.5 * partial.Count) / totalRequired;

        _logger.LogDebug(
            "SkillsEngine: Matched={M}, Partial={P}, Missing={X}, Score={S:F4}",
            matched.Count, partial.Count, missing.Count, score);

        return new SkillsResult
        {
            Matched = [.. matched],
            Partial = [.. partial],
            Missing = [.. missing],
            Score   = score
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static bool ContainsIgnoreCase(string source, string term)
        => source.Contains(term, StringComparison.OrdinalIgnoreCase);

    private static string ResolvePath(string path)
        => PathResolver.Resolve(path);
}
