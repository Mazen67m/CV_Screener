using System.ComponentModel.DataAnnotations;
using CVScreener.Core.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Middleware;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException)
        {
            httpContext.Response.StatusCode = 499;
            return true;
        }

        var (statusCode, error, details) = MapException(exception);
        if (statusCode >= StatusCodes.Status500InternalServerError)
            _logger.LogError(exception, "Unhandled exception.");
        else
            _logger.LogWarning(exception, "Handled exception: {Message}", exception.Message);

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(
            new ErrorResponse(error, details),
            cancellationToken);

        return true;
    }

    private static (int StatusCode, string Error, string[]? Details) MapException(Exception exception) =>
        exception switch
        {
            KeyNotFoundException => (
                StatusCodes.Status404NotFound,
                "Resource not found.",
                null),

            UnauthorizedAccessException => (
                StatusCodes.Status403Forbidden,
                "Access denied.",
                null),

            ArgumentNullException => (
                StatusCodes.Status400BadRequest,
                exception.Message,
                null),

            ArgumentException => (
                StatusCodes.Status400BadRequest,
                exception.Message,
                null),

            ValidationException => (
                StatusCodes.Status400BadRequest,
                "Validation failed.",
                [exception.Message]),

            FormatException => (
                StatusCodes.Status400BadRequest,
                "Invalid base64 encoding in cvBase64 field.",
                null),

            JdTooShortException or JdTooLongException => (
                StatusCodes.Status400BadRequest,
                exception.Message,
                null),

            CorruptedPdfException or EncryptedPdfException or ScannedPdfException => (
                StatusCodes.Status422UnprocessableEntity,
                exception.Message,
                null),

            _ => (
                StatusCodes.Status500InternalServerError,
                "An internal server error occurred.",
                null)
        };

    private sealed record ErrorResponse(string Error, string[]? Details);
}
