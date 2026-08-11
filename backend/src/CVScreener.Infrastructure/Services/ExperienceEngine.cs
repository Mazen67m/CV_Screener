using System.Text.RegularExpressions;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.Extensions.Logging;

namespace CVScreener.Infrastructure.Services;

/// <summary>
/// Extracts years of experience from CV and JD text and computes a 0–1 score.
///
/// Extraction pipeline (per text):
///   1. Regex: finds all "N years (of) (experience)" patterns → take maximum
///   2. If regex yields nothing → scan for seniority keywords:
///      entry/junior=1, mid=3, senior=5, lead=7, principal=9, staff=6
///   3. If nothing found at all → 0 years (from-fallback = false)
///
/// Score formula: Min(CvYears / Max(RequiredYears, 1), 1.0)
/// Special case: if both sides are 0 → Score = 0.5 (neutral, non-penalising).
///
/// Thread-safe: all regex instances are compiled static fields.
/// Lifetime: Scoped.
/// </summary>
public sealed class ExperienceEngine : IExperienceEngine
{
    private const double MaxReasonableYears = 50;

    // Matches: "5 years", "10+ years of experience", "3+ years exp"
    private static readonly Regex YearsRegex = new(
        @"(?<years>\d+)\+?\s*years?\s*(of\s*)?(experience|exp)?",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Seniority keyword → approximate years
    private static readonly Dictionary<string, double> SeniorityMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["entry"]     = 1,
            ["junior"]    = 1,
            ["mid"]       = 3,
            ["mid-level"] = 3,
            ["senior"]    = 5,
            ["sr"]        = 5,
            ["lead"]      = 7,
            ["staff"]     = 6,
            ["principal"] = 9,
            ["architect"] = 8
        };

    private readonly ILogger<ExperienceEngine> _logger;

    public ExperienceEngine(ILogger<ExperienceEngine> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public ExperienceResult Analyze(string cleanedCv, string cleanedJd)
    {
        var (cvYears, cvFromFallback) = ExtractYears(cleanedCv, "CV");
        var (requiredYears, jdFromFallback) = ExtractYears(cleanedJd, "JD");

        // Both unknowns → neutral score
        double score;
        if (cvYears == 0 && requiredYears == 0)
        {
            score = 0.5;
        }
        else
        {
            score = Math.Min(cvYears / Math.Max(requiredYears, 1.0), 1.0);
        }

        _logger.LogDebug(
            "ExperienceEngine: CV={C}y (fallback={CF}), Required={R}y (fallback={RF}), Score={S:F4}",
            cvYears, cvFromFallback, requiredYears, jdFromFallback, score);

        return new ExperienceResult
        {
            CvYears                  = cvYears,
            RequiredYears            = requiredYears,
            CvYearsFromFallback      = cvFromFallback,
            RequiredYearsFromFallback = jdFromFallback,
            Score                    = score
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Tries numeric regex first, then seniority keyword fallback.
    /// Returns (years, isFromFallback).
    /// </summary>
    private (double years, bool fromFallback) ExtractYears(string text, string source)
    {
        if (string.IsNullOrWhiteSpace(text))
            return (0, false);

        // ── 1. Numeric regex ──────────────────────────────────────────────────
        double maxYears = 0;
        foreach (Match m in YearsRegex.Matches(text))
        {
            if (double.TryParse(m.Groups["years"].Value, out double y) && y > maxYears)
                maxYears = y;
        }

        if (maxYears > MaxReasonableYears)
        {
            _logger.LogWarning(
                "ExperienceEngine capped extracted {Source} years from {ExtractedYears} to {MaxYears}.",
                source,
                maxYears,
                MaxReasonableYears);
            return (MaxReasonableYears, false);
        }

        if (maxYears > 0)
            return (maxYears, false);

        // ── 2. Seniority keyword fallback ─────────────────────────────────────
        foreach (var (keyword, years) in SeniorityMap)
        {
            if (text.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                return (years, true);
        }

        return (0, false);
    }
}
