using CVScreener.Core.Entities;
using CVScreener.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace CVScreener.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository        _userRepository;
    private readonly IUserProfileRepository _userProfileRepository;
    private readonly IClerkService          _clerkService;
    private readonly ILogger<AuthService>   _logger;

    public AuthService(
        IUserRepository        userRepository,
        IUserProfileRepository userProfileRepository,
        IClerkService          clerkService,
        ILogger<AuthService>   logger)
    {
        _userRepository        = userRepository;
        _userProfileRepository = userProfileRepository;
        _clerkService          = clerkService;
        _logger                = logger;
    }

    public async Task<User> SetUserRoleAsync(
        string       clerkId,
        string       email,
        string       role,
        UserProfile? profile = null)
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

        // 2. Atomically set the role in the DB (throws RoleAlreadySetException if already set).
        await _userRepository.SetRoleAsync(clerkId, role);

        // 3. Fetch the now-updated user to get their DB id for the profile FK.
        var updatedUser = await _userRepository.GetByClerkIdAsync(clerkId)
            ?? throw new KeyNotFoundException($"Failed to retrieve updated user profile for Clerk ID: {clerkId}");

        // 4. Persist optional profile fields (DEC-019 / F-13).
        if (profile is not null)
        {
            profile.UserId = updatedUser.Id;
            await _userProfileRepository.UpsertAsync(profile);
        }

        // 5. Mirror the role into Clerk publicMetadata so the frontend can read it
        //    from the session token without an extra API call.
        try
        {
            await _clerkService.UpdatePublicMetadataAsync(clerkId, new { role });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(
                ex,
                "User role was saved in the database, but Clerk metadata sync failed for user {ClerkId}.",
                clerkId);
        }

        return updatedUser;
    }
}
