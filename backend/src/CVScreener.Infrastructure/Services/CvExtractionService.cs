using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using CVScreener.Core;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Microsoft.Extensions.Logging;
using UglyToad.PdfPig;

namespace CVScreener.Infrastructure.Services;

public class CvExtractionService : ICvExtractionService
{
    private readonly ILogger<CvExtractionService> _logger;

    public CvExtractionService(ILogger<CvExtractionService> logger)
    {
        _logger = logger;
    }

    public async Task<string> ExtractTextAsync(Stream pdfStream)
    {
        if (pdfStream == null)
        {
            throw new ArgumentNullException(nameof(pdfStream));
        }

        // Copy stream to a MemoryStream to ensure seekability (required by PdfPig).
        // This is done asynchronously to avoid blocking a thread pool thread.
        using var seekableStream = new MemoryStream();
        await pdfStream.CopyToAsync(seekableStream);
        seekableStream.Position = 0;

        if (seekableStream.Length == 0)
        {
            throw new CorruptedPdfException("File appears to be corrupted.");
        }

        try
        {
            var textBuilder = new StringBuilder();
            using (var document = PdfDocument.Open(seekableStream))
            {
                foreach (var page in document.GetPages())
                {
                    var text = page.Text;
                    if (!string.IsNullOrEmpty(text))
                    {
                        textBuilder.Append(text);
                        textBuilder.Append(' ');
                    }
                }
            }

            var rawText = textBuilder.ToString().Trim();

            // Heuristic: no extractable text → likely a scanned/image-only PDF
            if (string.IsNullOrWhiteSpace(rawText))
            {
                throw new ScannedPdfException("PDF contains no readable text. It may be scanned.");
            }

            return TextCleaner.Clean(rawText);
        }
        catch (Exception ex) when (IsEncryptedPdfException(ex))
        {
            // PdfPig throws a generic exception for encrypted documents;
            // we surface a specific, user-friendly error instead of "corrupted".
            _logger.LogWarning("Encrypted PDF upload attempted.");
            throw new EncryptedPdfException("PDF is password-protected. Please remove the password and try again.");
        }
        catch (Exception ex) when (ex is not ScannedPdfException && ex is not CorruptedPdfException && ex is not EncryptedPdfException)
        {
            // Log the raw exception detail here so it stays in observability tooling
            // and never leaks into the HTTP response or domain exception message.
            _logger.LogWarning(ex, "Failed to parse PDF document.");
            throw new CorruptedPdfException("File appears to be corrupted.");
        }
    }

    /// <summary>
    /// Detects whether an exception from PdfPig is caused by an encrypted document.
    /// PdfPig does not expose a dedicated exception type for this case, so we
    /// inspect the message as a heuristic.
    /// </summary>
    private static bool IsEncryptedPdfException(Exception ex)
    {
        var msg = ex.Message ?? string.Empty;
        return msg.Contains("encrypted", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("password", StringComparison.OrdinalIgnoreCase);
    }
}
