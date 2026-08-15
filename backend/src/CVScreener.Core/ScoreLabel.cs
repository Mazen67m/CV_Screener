namespace CVScreener.Core;

/// <summary>
/// Maps a 0–100 overall score to a human-readable label.
///
/// Thresholds (DEC-018 / F-07 spec):
///   0–30   → Poor Match
///   31–50  → Below Average
///   51–70  → Average Match
///   71–85  → Good Match
///   86–100 → Excellent Match
///
/// Used by MatchingService (fresh results), AnalysisRepository (cached reads),
/// and all API response DTOs. Never compute labels in controllers or the frontend.
/// </summary>
public static class ScoreLabel
{
    public static string FromScore(int score) => score switch
    {
        <= 30 => "Poor Match",
        <= 50 => "Below Average",
        <= 70 => "Average Match",
        <= 85 => "Good Match",
        _     => "Excellent Match"
    };
}
