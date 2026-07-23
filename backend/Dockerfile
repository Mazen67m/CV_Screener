FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["src/CVScreener.API/CVScreener.API.csproj", "src/CVScreener.API/"]
COPY ["src/CVScreener.Core/CVScreener.Core.csproj", "src/CVScreener.Core/"]
COPY ["src/CVScreener.Infrastructure/CVScreener.Infrastructure.csproj", "src/CVScreener.Infrastructure/"]

RUN dotnet restore "src/CVScreener.API/CVScreener.API.csproj"

COPY . .
WORKDIR "/src/src/CVScreener.API"
RUN dotnet build "CVScreener.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CVScreener.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "CVScreener.API.dll"]
