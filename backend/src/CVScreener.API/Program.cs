using CVScreener.API.Middleware;
using CVScreener.Core.Interfaces;
using CVScreener.Core.Models;
using CVScreener.Infrastructure.Data;
using CVScreener.Infrastructure.Repositories;
using CVScreener.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

// Load .env — search multiple candidate directories so the file is found
// regardless of whether the app is launched via `dotnet run`, Visual Studio,
// Rider, or a compiled binary (working dir vs. exe dir are often different).
static string? FindEnvFile()
{
    // 1. Current working directory (works for `dotnet run` from project folder)
    var cwd = Path.Combine(Directory.GetCurrentDirectory(), ".env");
    if (File.Exists(cwd)) return cwd;

    // 2. Executable directory (works when running the compiled binary or from VS/Rider)
    var exeDir = Path.Combine(AppContext.BaseDirectory, ".env");
    if (File.Exists(exeDir)) return exeDir;

    // 3. Walk up from the exe directory (handles bin/Debug/net8.0/ → project root)
    var dir = new DirectoryInfo(AppContext.BaseDirectory);
    while (dir is not null)
    {
        var candidate = Path.Combine(dir.FullName, ".env");
        if (File.Exists(candidate)) return candidate;
        dir = dir.Parent;
    }

    return null;
}

var envPath = FindEnvFile();
if (envPath is not null)
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        if (string.IsNullOrWhiteSpace(line) || line.TrimStart().StartsWith('#'))
            continue; // skip blank lines and comments

        var parts = line.Split('=', 2);
        if (parts.Length == 2)
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim());
    }
}

var builder = WebApplication.CreateBuilder(args);

// Apply environment variables to Configuration
builder.Configuration.AddEnvironmentVariables();

// ─── Services ────────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var details = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .SelectMany(entry => entry.Value!.Errors.Select(error =>
                $"{entry.Key}: {error.ErrorMessage}"))
            .ToArray();

        return new BadRequestObjectResult(new
        {
            error = "Validation failed.",
            details
        });
    };
});

// ─── Swagger / OpenAPI ───────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "CV Screener API",
        Version     = "v1",
        Description = "Backend API for the CV Screener application. " +
                      "Authenticate via Clerk JWT — paste your bearer token using the Authorize button.",
        Contact = new OpenApiContact
        {
            Name = "CV Screener Team"
        }
    });

    // ── JWT Bearer security definition ──────────────────────────────────────
    var jwtScheme = new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Description  = "Enter your Clerk JWT as: **Bearer {token}**",
        In           = ParameterLocation.Header,
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id   = "Bearer"
        }
    };
    options.AddSecurityDefinition("Bearer", jwtScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtScheme, Array.Empty<string>() }
    });

    // ── Include XML doc comments ─────────────────────────────────────────────
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        options.IncludeXmlComments(xmlPath);
});

// JWT Authentication pointing to Clerk
var clerkAuthority = builder.Configuration["Clerk:Authority"];
if (string.IsNullOrWhiteSpace(clerkAuthority))
    clerkAuthority = builder.Configuration["CLERK__AUTHORITY"];

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = clerkAuthority;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            // Clerk JWTs do not contain an audience claim (aud) by default unless specifically
            // configured with a custom template in the Clerk Dashboard. To avoid signature validation
            // failures on standard Clerk tokens, we set ValidateAudience = false. If a custom audience
            // is configured in Clerk in the future, ValidAudiences should be configured here.
            ValidateAudience = false,
            ValidateLifetime = true
        };
    });

// Repositories & DB Factory
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IAnalysisRepository, AnalysisRepository>();
builder.Services.AddScoped<IDashboardRepository, DashboardRepository>();
builder.Services.AddScoped<ILearningPathRepository, LearningPathRepository>();
builder.Services.AddScoped<IUserProfileRepository, UserProfileRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICvExtractionService, CvExtractionService>();
builder.Services.AddScoped<IJdValidationService, JdValidationService>();

// ML — ONNX inference service (DEC-002: canonical IOnnxInferenceService — loads tfidf.onnx once at startup)
// IMPORTANT: TfIdfService intentionally NOT registered under IOnnxInferenceService.
//            It is kept only under ITfIdfService below for reference/testing purposes.
builder.Services.Configure<MlOptions>(builder.Configuration.GetSection(MlOptions.SectionName));
builder.Services.AddSingleton<IOnnxInferenceService, OnnxInferenceService>();
builder.Services.AddSingleton<ITfIdfService, TfIdfService>(); // JSON-based C# fallback — reference only

// Phase 2 — Matching Engine services
builder.Services.Configure<SkillsEngineOptions>(
    builder.Configuration.GetSection(SkillsEngineOptions.SectionName));
builder.Services.AddSingleton<ISkillsEngine, SkillsEngine>();      // Singleton: taxonomy loaded once
builder.Services.AddScoped<IExperienceEngine, ExperienceEngine>(); // Scoped: stateless
builder.Services.AddScoped<IMatchingService, MatchingService>();   // Scoped: orchestrator

// Clerk backend API client (typed HttpClient — avoids socket exhaustion)
builder.Services.AddHttpClient<IClerkService, ClerkService>();

// CORS — allow Next.js frontend
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:3000", "http://127.0.0.1:3000"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// ─── Build ────────────────────────────────────────────────────────────────────
var app = builder.Build();

// ─── Swagger UI ───────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CV Screener API v1");
        c.RoutePrefix = "swagger";
        c.DocumentTitle = "CV Screener API Docs";
    });
}

app.UseExceptionHandler(_ => { });

app.UseCors("FrontendPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
