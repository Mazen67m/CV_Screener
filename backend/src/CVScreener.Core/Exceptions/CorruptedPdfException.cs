namespace CVScreener.Core.Exceptions;

public class CorruptedPdfException : Exception
{
    public CorruptedPdfException(string message) : base(message) { }
}
