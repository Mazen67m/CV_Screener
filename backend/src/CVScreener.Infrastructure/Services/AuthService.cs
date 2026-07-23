using CVScreener.Core.Entities;
using CVScreener.Core.Interfaces;

namespace CVScreener.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IClerkService _clerkService;

    public AuthService(IUserRepository userRepository, IClerkService clerkService)
    {
        _userRepository = userRepository;
        _clerkService = clerkService;
    }

    public async Task<User> SetUserRoleAsync(string clerkId, string email, string role)
    {
        // 1. Ensure the user row exists in our DB (on-demand upsert for new signups).
        var existingUser = await _userRepository.GetByClerkIdAsync(clerkId);
        if (existingUser == null)
        {
            await _userRepository.UpsertAsync(new User
            {
                ClerkId = clerkId,
                Email   = email
            });
        }

        // 2. Atomically set the role in the DB (throws if already set).
        await _userRepository.SetRoleAsync(clerkId, role);

        // 3. Mirror the role into Clerk publicMetadata so middleware/frontend
        //    can read it from the session token without an extra API call.
        await _clerkService.UpdatePublicMetadataAsync(clerkId, new { role = role });

        // 4. Return the updated profile.
        var updatedUser = await _userRepository.GetByClerkIdAsync(clerkId);
        if (updatedUser == null)
        {
            throw new KeyNotFoundException($"Failed to retrieve updated user profile for Clerk ID: {clerkId}");
        }

        return updatedUser;
    }
}
