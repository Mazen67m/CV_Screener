using CVScreener.Core.Models;

namespace CVScreener.Core.Interfaces;

public interface IAnalysisRepository
{
    Task<IReadOnlyList<AnalysisHistoryItem>> GetHistoryAsync(
        string clerkId,
        int? limit = null,
        CancellationToken cancellationToken = default);

    Task<AnalysisResult?> GetByIdAsync(
        Guid id,
        string clerkId,
        CancellationToken cancellationToken = default);
}
