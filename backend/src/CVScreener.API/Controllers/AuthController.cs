using System.Security.Claims;
using CVScreener.API.DTOs.Auth;
using CVScreener.Core.Entities;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IUserRepository userRepository,
        IAuthService authService,
        ILogger<AuthController> logger)
    {
        _userRepository = userRepository;
        _authService   = authService;
        _logger        = logger;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        try
        {
            var clerkId = GetClerkIdFromToken();

            if (string.IsNullOrEmpty(clerkId))
                return Unauthorized(new { error = "Clerk ID not found in token claims." });

            var user = await _userRepository.GetByClerkIdAsync(clerkId);
            if (user == null)
            {
                // Authenticated via Clerk but not yet in our DB — new user before role selection.
                // Return a consistent UserResponse shape with a null role so clients
                // don't need to handle two different response structures.
                return Ok(new UserResponse
                {
                    Id        = Guid.Empty,
                    ClerkId   = clerkId,
                    Email     = string.Empty,
                    Role      = null,
                    CreatedAt = DateTime.UtcNow
                });
            }

            return Ok(MapToResponse(user));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching current user profile.");
            return StatusCode(500, new { error = "An internal server error occurred." });
        }
    }

    [HttpPost("role")]
    public async Task<IActionResult> SetRole([FromBody] SetRoleRequest request)
    {
        try
        {
            var clerkId = GetClerkIdFromToken();
            var email = GetEmailFromToken();

            if (string.IsNullOrEmpty(clerkId))
                return Unauthorized(new { error = "Clerk ID not found in token claims." });

            // Delegate upsert, set-role, Clerk sync, and return-user to AuthService
            var updatedUser = await _authService.SetUserRoleAsync(clerkId, email, request.Role);

            return Ok(MapToResponse(updatedUser));
        }
        catch (RoleAlreadySetException)
        {
            return Conflict(new { error = "Role is already set and cannot be changed." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting user role.");
            return StatusCode(500, new { error = "An internal server error occurred." });
        }
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /// <summary>Extracts the Clerk user ID from the validated JWT.</summary>
    private string? GetClerkIdFromToken() =>
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? User.FindFirst("sub")?.Value;

    /// <summary>Extracts the email claim from the validated JWT (empty string if absent).</summary>
    private string GetEmailFromToken() =>
        User.FindFirst(ClaimTypes.Email)?.Value
        ?? User.FindFirst("email")?.Value
        ?? string.Empty;

    private static UserResponse MapToResponse(User user) => new()
    {
        Id        = user.Id,
        ClerkId   = user.ClerkId,
        Email     = user.Email,
        Role      = user.Role,
        CreatedAt = user.CreatedAt
    };
}
