namespace CVScreener.Core.Interfaces;

public interface IClerkService
{
    /// <summary>
    /// Merges the supplied key/value pairs into the user's Clerk publicMetadata.
    /// Existing keys not present in <paramref name="metadata"/> are left untouched.
    /// </summary>
    Task UpdatePublicMetadataAsync(string clerkId, object metadata);
}
