namespace CVScreener.Core.Exceptions;

/// <summary>
/// Thrown when a PDF document is encrypted/password-protected
/// and cannot be opened without a password.
/// </summary>
public class EncryptedPdfException : Exception
{
    public EncryptedPdfException(string message) : base(message) { }
}
