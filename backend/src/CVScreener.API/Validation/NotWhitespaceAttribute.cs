using System.ComponentModel.DataAnnotations;

namespace CVScreener.API.Validation;

[AttributeUsage(AttributeTargets.Property)]
public sealed class NotWhitespaceAttribute : ValidationAttribute
{
    public NotWhitespaceAttribute()
        : base("The field must not be empty or contain only whitespace.")
    {
    }

    public override bool IsValid(object? value) =>
        value is not string text || !string.IsNullOrWhiteSpace(text);
}
