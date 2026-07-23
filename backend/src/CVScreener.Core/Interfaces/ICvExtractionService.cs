namespace CVScreener.Core.Interfaces;

public interface ICvExtractionService
{
    /// <summary>
    /// Extracts and cleans text from a PDF stream.
    /// </summary>
    /// <param name="pdfStream">The raw PDF file stream.</param>
    /// <returns>Cleaned text string.</returns>
    /// <exception cref="CVScreener.Core.Exceptions.ScannedPdfException">
    ///   Thrown when PdfPig extracts zero or near-zero text (likely scanned image PDF).
    /// </exception>
    /// <exception cref="CVScreener.Core.Exceptions.EncryptedPdfException">
    ///   Thrown when the PDF is password-protected and cannot be opened.
    /// </exception>
    /// <exception cref="CVScreener.Core.Exceptions.CorruptedPdfException">
    ///   Thrown when PdfPig cannot open/parse the document for any other reason.
    /// </exception>
    Task<string> ExtractTextAsync(Stream pdfStream);
}
