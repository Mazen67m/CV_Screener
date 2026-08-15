using CVScreener.Core.Entities;

namespace CVScreener.Core.Interfaces;

/// <summary>
/// Persists and retrieves user profile data from the user_profiles table.
/// </summary>
public interface IUserProfileRepository
{
    /// <summary>
    /// Inserts or updates the profile for the given user.
    /// Uses ON CONFLICT (user_id) DO UPDATE so it is safe to call on every role-set.
    /// </summary>
    Task UpsertAsync(UserProfile profile, CancellationToken ct = default);

    /// <summary>
    /// Returns the profile for a user, or null if not yet created.
    /// </summary>
    Task<UserProfile?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
}
