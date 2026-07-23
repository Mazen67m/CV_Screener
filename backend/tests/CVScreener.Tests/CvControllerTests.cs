using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CVScreener.API.Controllers;
using CVScreener.API.DTOs.Cv;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CVScreener.Tests;

public class CvControllerTests
{
    private readonly MockCvExtractionService _extractionService;
    private readonly CvController _controller;

    public CvControllerTests()
    {
        _extractionService = new MockCvExtractionService();
        _controller = new CvController(_extractionService, NullLogger<CvController>.Instance);
    }

    [Fact]
    public async Task ExtractCv_ValidPdf_ReturnsOkWithResponse()
    {
        // 55 words text to pass the min-50-words check
        var validText = string.Join(" ", System.Linq.Enumerable.Repeat("word", 55)); 
        _extractionService.ExtractedTextResult = validText;

        var mockFile = new MockFormFile("resume.pdf", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<CvExtractResponse>(okResult.Value);
        Assert.True(response.ExtractionSuccess);
        Assert.Equal(55, response.WordCount);
    }

    [Fact]
    public async Task ExtractCv_InvalidExtension_ReturnsBadRequest()
    {
        var mockFile = new MockFormFile("resume.docx", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        
        // Assert error format always: { "error": "message" }
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Invalid file type. PDF only.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_InvalidContentType_ReturnsBadRequest()
    {
        var mockFile = new MockFormFile("resume.pdf", "image/png", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Invalid file type. PDF only.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_FileTooLarge_ReturnsBadRequest()
    {
        // 5MB + 1 byte
        long size = 5 * 1024 * 1024 + 1;
        var mockFile = new MockFormFile("large.pdf", "application/pdf", size);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("File too large. Max 5MB.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_ScannedPdf_ReturnsUnprocessableEntity()
    {
        _extractionService.ExceptionToThrow = new ScannedPdfException("Scanned PDF");

        var mockFile = new MockFormFile("scanned.pdf", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(result);
        var errorObj = unprocessable.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("PDF appears to be scanned. Please copy-paste your CV text.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_CorruptedPdf_ReturnsUnprocessableEntity()
    {
        _extractionService.ExceptionToThrow = new CorruptedPdfException("Corrupted PDF");

        var mockFile = new MockFormFile("corrupted.pdf", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(result);
        var errorObj = unprocessable.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("File appears to be corrupted.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_TextTooShort_ReturnsUnprocessableEntity()
    {
        // less than 50 words
        _extractionService.ExtractedTextResult = "only a few words here";

        var mockFile = new MockFormFile("short.pdf", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(result);
        var errorObj = unprocessable.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("CV too short. Please upload a complete CV.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_NullFile_ReturnsBadRequestWithCorrectMessage()
    {
        var request = new CvExtractRequest { File = null! };

        var result = await _controller.ExtractCv(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        // Must say "No file provided." — not "Invalid file type"
        Assert.Equal("No file provided.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_EncryptedPdf_ReturnsUnprocessableEntity()
    {
        _extractionService.ExceptionToThrow = new EncryptedPdfException("Encrypted PDF");

        var mockFile = new MockFormFile("protected.pdf", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(result);
        var errorObj = unprocessable.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("PDF is password-protected. Please remove the password and try again.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ExtractCv_EmptyText_ReturnsUnprocessableEntity()
    {
        _extractionService.ExtractedTextResult = "";

        var mockFile = new MockFormFile("empty.pdf", "application/pdf", 1000);
        var request = new CvExtractRequest { File = mockFile };

        var result = await _controller.ExtractCv(request);

        var unprocessable = Assert.IsType<UnprocessableEntityObjectResult>(result);
        var errorObj = unprocessable.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Could not extract content from this file.", errorProp.GetValue(errorObj));
    }

    // ─── Custom Mocks ────────────────────────────────────────────────────────

    private class MockCvExtractionService : ICvExtractionService
    {
        public string ExtractedTextResult { get; set; } = string.Empty;
        public Exception? ExceptionToThrow { get; set; }

        public Task<string> ExtractTextAsync(Stream pdfStream)
        {
            if (ExceptionToThrow != null)
            {
                throw ExceptionToThrow;
            }
            return Task.FromResult(ExtractedTextResult);
        }
    }

    private class MockFormFile : IFormFile
    {
        private readonly byte[] _content;

        public MockFormFile(string fileName, string contentType, long size)
        {
            FileName = fileName;
            ContentType = contentType;
            _content = new byte[size];
            Length = size;
        }

        public string ContentType { get; }
        public string ContentDisposition => $"form-data; name=\"file\"; filename=\"{FileName}\"";
        public IHeaderDictionary Headers => new HeaderDictionary();
        public long Length { get; }
        public string Name => "file";
        public string FileName { get; }

        public Stream OpenReadStream() => new MemoryStream(_content);
        public void CopyTo(Stream target) => OpenReadStream().CopyTo(target);
        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default) => OpenReadStream().CopyToAsync(target, cancellationToken);
    }
}
