using Microsoft.AspNetCore.Mvc;

namespace CVScreener.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
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
