using CVScreener.API.Controllers;
using CVScreener.API.DTOs.Jd;
using CVScreener.Core.Exceptions;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace CVScreener.Tests;

public class JdControllerTests
{
    private readonly MockJdValidationService _validationService;
    private readonly JdController _controller;

    public JdControllerTests()
    {
        _validationService = new MockJdValidationService();
        _controller = new JdController(_validationService, NullLogger<JdController>.Instance);
    }

    [Fact]
    public async Task ValidateJd_ValidInput_ReturnsOkWithResponse()
    {
        _validationService.ResultToReturn = new JdValidationResult("cleaned text", 55, true);
        var request = new JdValidateRequest { Text = "some raw text" };

        var result = await _controller.ValidateJd(request);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<JdValidateResponse>(okResult.Value);
        Assert.True(response.Valid);
        Assert.Equal(55, response.WordCount);
        Assert.Equal("cleaned text", response.CleanedText);
    }

    [Fact]
    public async Task ValidateJd_NullRequest_ReturnsBadRequest()
    {
        var result = await _controller.ValidateJd(null!);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Job description text must be provided.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ValidateJd_EmptyText_ReturnsBadRequest()
    {
        var request = new JdValidateRequest { Text = "   " };

        var result = await _controller.ValidateJd(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Job description text must be provided.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ValidateJd_TooShort_ReturnsBadRequestWithError()
    {
        _validationService.ExceptionToThrow = new JdTooShortException("Too short");
        var request = new JdValidateRequest { Text = "too short" };

        var result = await _controller.ValidateJd(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Job description too short. Minimum 50 words.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ValidateJd_TooLong_ReturnsBadRequestWithError()
    {
        _validationService.ExceptionToThrow = new JdTooLongException("Too long");
        var request = new JdValidateRequest { Text = "too long" };

        var result = await _controller.ValidateJd(request);

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        var errorObj = badRequest.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("Job description too long. Maximum 5000 words.", errorProp.GetValue(errorObj));
    }

    [Fact]
    public async Task ValidateJd_UnexpectedException_ReturnsInternalServerError()
    {
        _validationService.ExceptionToThrow = new Exception("Unexpected error");
        var request = new JdValidateRequest { Text = "some text" };

        var result = await _controller.ValidateJd(request);

        var statusCodeResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusCodeResult.StatusCode);
        var errorObj = statusCodeResult.Value;
        var errorProp = errorObj!.GetType().GetProperty("error")!;
        Assert.NotNull(errorProp);
        Assert.Equal("An internal server error occurred.", errorProp.GetValue(errorObj));
    }

    // ─── Custom Mocks ────────────────────────────────────────────────────────

    private class MockJdValidationService : IJdValidationService
    {
        public JdValidationResult ResultToReturn { get; set; } = new JdValidationResult(string.Empty, 0, false);
        public Exception? ExceptionToThrow { get; set; }

        public Task<JdValidationResult> ValidateAsync(string rawText)
        {
            if (ExceptionToThrow != null)
            {
                // Return a faulted task so the controller's catch blocks are exercised
                // the same way they would be with a real async implementation.
                return Task.FromException<JdValidationResult>(ExceptionToThrow);
            }
            return Task.FromResult(ResultToReturn);
        }
    }
}
