using CVScreener.Core.Entities;

namespace CVScreener.Core.Interfaces;

public interface IAuthService
{
    Task<User> SetUserRoleAsync(string clerkId, string email, string role);
}
