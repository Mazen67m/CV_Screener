namespace CVScreener.Core.Exceptions;

public class RoleAlreadySetException : Exception
{
    public RoleAlreadySetException() : base("Role is already set and cannot be changed.") { }
}
