using CVScreener.Core.Entities;

namespace CVScreener.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByClerkIdAsync(string clerkId);
    Task UpsertAsync(User user);
    Task SetRoleAsync(string clerkId, string role);
}
