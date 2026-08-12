using System.Security.Claims;
using CVScreener.API.Controllers;
using CVScreener.API.DTOs.Auth;
using CVScreener.Core.Entities;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using CVScreener.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CVScreener.Tests;

public class AuthTests
{
    private readonly MockUserRepository _userRepository;
    private readonly MockClerkService   _clerkService;
    private readonly AuthService        _authService;
    private readonly AuthController     _controller;

    public AuthTests()
    {
        _userRepository = new MockUserRepository();
        _clerkService   = new MockClerkService();
        _authService    = new AuthService(
            _userRepository,
            _clerkService,
            NullLogger<AuthService>.Instance);
        _controller     = new AuthController(
            _userRepository,
            _authService,
            NullLogger<AuthController>.Instance);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void SetupControllerContext(string? clerkId = "user_123", string? email = "test@example.com")
    {
        var claims = new List<Claim>();
        if (clerkId != null) claims.Add(new Claim(ClaimTypes.NameIdentifier, clerkId));
        if (email   != null) claims.Add(new Claim(ClaimTypes.Email, email));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };
    }

    private void SetupAnonymousContext()
    {
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity()) // no claims
            }
        };
    }

    // ─── GetMe ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetMe_NoClerkIdInToken_ReturnsUnauthorized()
    {
        SetupAnonymousContext();

        var result = await _controller.GetMe();

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task GetMe_UserNotInDb_ReturnsUserResponseWithNullRole()
    {
        SetupControllerContext("user_new", "new@example.com");

        var result = await _controller.GetMe();

        // GetMe now always returns a UserResponse — consistent shape regardless of DB state.
        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserResponse>(ok.Value);
        Assert.Null(response.Role);
        Assert.Equal("user_new", response.ClerkId);
    }

    [Fact]
    public async Task GetMe_UserExistsWithRole_ReturnsFullProfile()
    {
        var user = new User { Id = Guid.NewGuid(), ClerkId = "user_exists", Email = "exists@example.com", CreatedAt = DateTime.UtcNow };
        await _userRepository.UpsertAsync(user);
        await _userRepository.SetRoleAsync("user_exists", "job_seeker");
        SetupControllerContext("user_exists", "exists@example.com");

        var result = await _controller.GetMe();

        var ok       = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserResponse>(ok.Value);
        Assert.Equal("user_exists", response.ClerkId);
        Assert.Equal("job_seeker",  response.Role);
    }

    // ─── SetRole ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task SetRole_NoClerkIdInToken_ReturnsUnauthorized()
    {
        SetupAnonymousContext();

        var result = await _controller.SetRole(new SetRoleRequest { Role = "job_seeker" });

        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task SetRole_NewUser_CreatesUserSetsRoleAndSyncsClerkMetadata()
    {
        SetupControllerContext("user_first", "first@example.com");

        var result = await _controller.SetRole(new SetRoleRequest { Role = "recruiter" });

        // Correct HTTP response
        var ok       = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserResponse>(ok.Value);
        Assert.Equal("user_first",  response.ClerkId);
        Assert.Equal("recruiter",   response.Role);

        // Role persisted in DB
        var saved = await _userRepository.GetByClerkIdAsync("user_first");
        Assert.NotNull(saved);
        Assert.Equal("recruiter", saved!.Role);

        // Clerk metadata was updated exactly once with the correct role
        Assert.Single(_clerkService.Calls);
        Assert.Equal("user_first", _clerkService.Calls[0].ClerkId);
        Assert.Equal("recruiter",  _clerkService.Calls[0].Role);
    }

    [Fact]
    public async Task SetRole_RoleAlreadySet_ReturnsConflictAndDoesNotCallClerk()
    {
        var user = new User { Id = Guid.NewGuid(), ClerkId = "user_twice", Email = "twice@example.com", CreatedAt = DateTime.UtcNow };
        await _userRepository.UpsertAsync(user);
        await _userRepository.SetRoleAsync("user_twice", "job_seeker");

        SetupControllerContext("user_twice", "twice@example.com");

        var result = await _controller.SetRole(new SetRoleRequest { Role = "recruiter" });

        Assert.IsType<ConflictObjectResult>(result);

        // Clerk must NOT be called — DB write never happened.
        Assert.Empty(_clerkService.Calls);
    }

    [Fact]
    public async Task SetRole_ClerkSyncFails_ReturnsSavedUserProfile()
    {
        // Arrange: wire up a controller backed by a Clerk service that always throws.
        var userRepo      = new MockUserRepository();
        var failingClerk  = new FailingMockClerkService();
        var authService   = new AuthService(
            userRepo,
            failingClerk,
            NullLogger<AuthService>.Instance);
        var controller    = new AuthController(
            userRepo,
            authService,
            NullLogger<AuthController>.Instance);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "user_syncfail"),
            new(ClaimTypes.Email, "syncfail@example.com")
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };

        // Act
        var result = await controller.SetRole(new SetRoleRequest { Role = "job_seeker" });

        // Assert: the saved DB role is still returned even when Clerk metadata sync fails.
        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<UserResponse>(ok.Value);
        Assert.Equal("user_syncfail", response.ClerkId);
        Assert.Equal("job_seeker", response.Role);

        var saved = await userRepo.GetByClerkIdAsync("user_syncfail");
        Assert.NotNull(saved);
        Assert.Equal("job_seeker", saved!.Role);
    }

    [Fact]
    public async Task ClerkService_NoSecretKey_SkipsMetadataSyncWithoutThrowing()
    {
        var config = new ConfigurationBuilder().Build();
        var service = new ClerkService(
            new HttpClient(),
            config,
            NullLogger<ClerkService>.Instance);

        await service.UpdatePublicMetadataAsync("user_no_secret", new { role = "job_seeker" });
    }
}

// ─── MockUserRepository ───────────────────────────────────────────────────────

public class MockUserRepository : IUserRepository
{
    public List<User> Users { get; } = new();

    public Task<User?> GetByClerkIdAsync(string clerkId)
    {
        var user = Users.FirstOrDefault(u => u.ClerkId == clerkId);
        return Task.FromResult(user);
    }

    public Task UpsertAsync(User user)
    {
        var existing = Users.FirstOrDefault(u => u.ClerkId == user.ClerkId);
        if (existing != null)
        {
            existing.Email = user.Email;
        }
        else
        {
            if (user.Id == Guid.Empty) user.Id = Guid.NewGuid();
            Users.Add(user);
        }
        return Task.CompletedTask;
    }

    public Task SetRoleAsync(string clerkId, string role)
    {
        var user = Users.FirstOrDefault(u => u.ClerkId == clerkId);
        if (user == null)
            throw new KeyNotFoundException($"User with ClerkId '{clerkId}' not found.");
        if (user.Role != null)
            throw new RoleAlreadySetException();
        user.Role = role;
        return Task.CompletedTask;
    }
}

// ─── MockClerkService ─────────────────────────────────────────────────────────

public record ClerkMetadataCall(string ClerkId, string Role);

public class MockClerkService : IClerkService
{
    public List<ClerkMetadataCall> Calls { get; } = new();

    public Task UpdatePublicMetadataAsync(string clerkId, object metadata)
    {
        // Extract role from the anonymous object the controller passes in.
        var roleProp = metadata.GetType().GetProperty("role");
        var role     = roleProp?.GetValue(metadata)?.ToString() ?? string.Empty;
        Calls.Add(new ClerkMetadataCall(clerkId, role));
        return Task.CompletedTask;
    }
}

// ─── FailingMockClerkService ──────────────────────────────────────────────────
// Simulates the split-brain scenario: DB write succeeds but Clerk sync fails.

public class FailingMockClerkService : IClerkService
{
    public Task UpdatePublicMetadataAsync(string clerkId, object metadata)
    {
        throw new HttpRequestException("Simulated Clerk API failure.");
    }
}
