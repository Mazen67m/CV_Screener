using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using CVScreener.Core.Exceptions;
using CVScreener.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CVScreener.Tests;

public class CvExtractionServiceTests
{
    private readonly CvExtractionService _service;

    public CvExtractionServiceTests()
    {
        // NullLogger discards all log output — safe for unit tests
        _service = new CvExtractionService(NullLogger<CvExtractionService>.Instance);
    }

    [Fact]
    public async Task ExtractTextAsync_NullStream_ThrowsArgumentNullException()
    {
        await Assert.ThrowsAsync<ArgumentNullException>(() => _service.ExtractTextAsync(null!));
    }

    [Fact]
    public async Task ExtractTextAsync_EmptyStream_ThrowsCorruptedPdfException()
    {
        using var emptyStream = new MemoryStream();
        
        await Assert.ThrowsAsync<CorruptedPdfException>(() => _service.ExtractTextAsync(emptyStream));
    }

    [Fact]
    public async Task ExtractTextAsync_CorruptedStream_ThrowsCorruptedPdfException()
    {
        var corruptedBytes = new byte[] { 0x1, 0x2, 0x3, 0x4, 0x5 };
        using var corruptedStream = new MemoryStream(corruptedBytes);

        await Assert.ThrowsAsync<CorruptedPdfException>(() => _service.ExtractTextAsync(corruptedStream));
    }

    [Fact]
    public async Task ExtractTextAsync_ValidPdf_ReturnsCleanedText()
    {
        using var validPdf = CreateValidPdfStream();
        var result = await _service.ExtractTextAsync(validPdf);

        Assert.Equal("hello world", result); // Cleaned & lowercased
    }

    [Fact]
    public async Task ExtractTextAsync_ScannedPdf_ThrowsScannedPdfException()
    {
        using var scannedPdf = CreateScannedPdfStream();
        
        await Assert.ThrowsAsync<ScannedPdfException>(() => _service.ExtractTextAsync(scannedPdf));
    }

    // ─── Minimal PDF Generators for Testing ──────────────────────────────────

    private Stream CreateValidPdfStream()
    {
        // Minimal valid PDF structure with text "Hello World"
        var pdfContent = 
            "%PDF-1.4\n" +
            "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n" +
            "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n" +
            "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>> >> endobj\n" +
            "4 0 obj <</Length 44>> stream\n" +
            "BT\n" +
            "/F1 12 Tf\n" +
            "72 712 Td\n" +
            "(Hello World) Tj\n" +
            "ET\n" +
            "endstream\n" +
            "endobj\n" +
            "5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n" +
            "xref\n" +
            "0 6\n" +
            "0000000000 65535 f \n" +
            "0000000009 00000 n \n" +
            "0000000056 00000 n \n" +
            "0000000111 00000 n \n" +
            "0000000250 00000 n \n" +
            "0000000344 00000 n \n" +
            "trailer <</Size 6 /Root 1 0 R>>\n" +
            "startxref\n" +
            "423\n" +
            "%%EOF";

        return new MemoryStream(Encoding.ASCII.GetBytes(pdfContent));
    }

    private Stream CreateScannedPdfStream()
    {
        // Minimal PDF structure with 1 page but no text stream (simulating a scanned image page)
        var pdfContent = 
            "%PDF-1.4\n" +
            "1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n" +
            "2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n" +
            "3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources <<>> >> endobj\n" +
            "xref\n" +
            "0 4\n" +
            "0000000000 65535 f \n" +
            "0000000009 00000 n \n" +
            "0000000056 00000 n \n" +
            "0000000111 00000 n \n" +
            "trailer <</Size 4 /Root 1 0 R>>\n" +
            "startxref\n" +
            "208\n" +
            "%%EOF";

        return new MemoryStream(Encoding.ASCII.GetBytes(pdfContent));
    }
}
