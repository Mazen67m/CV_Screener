using CVScreener.Core.Entities;

namespace CVScreener.Core.Interfaces;

public interface IAuthService
{
    /// <summary>
    /// Sets the user's role in the DB and syncs it to Clerk metadata.
    /// Also upserts the extended profile fields into user_profiles (DEC-019).
    /// Throws RoleAlreadySetException if the role was already set.
    /// </summary>
    Task<User> SetUserRoleAsync(
        string clerkId,
        string email,
        string role,
        UserProfile? profile = null);
}
