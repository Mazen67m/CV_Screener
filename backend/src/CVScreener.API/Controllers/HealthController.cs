using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

/// <summary>Liveness probe endpoint.</summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    /// <summary>Returns the API liveness status, version, and server UTC timestamp.</summary>
    /// <response code="200">Service is healthy.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Get()
    {
        return Ok(new
        {
            status  = "ok",
            version = "1.0",
            timestamp = DateTime.UtcNow
        });
    }
}
