FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["backend/src/CVScreener.API/CVScreener.API.csproj", "src/CVScreener.API/"]
COPY ["backend/src/CVScreener.Core/CVScreener.Core.csproj", "src/CVScreener.Core/"]
COPY ["backend/src/CVScreener.Infrastructure/CVScreener.Infrastructure.csproj", "src/CVScreener.Infrastructure/"]

RUN dotnet restore "src/CVScreener.API/CVScreener.API.csproj"

COPY backend/ .
WORKDIR "/src/src/CVScreener.API"
RUN dotnet build "CVScreener.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CVScreener.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Copy ML models and skills taxonomy into the container
COPY ml/models/ /app/ml/models/
COPY ml/skills_taxonomy.json /app/ml/skills_taxonomy.json

ENTRYPOINT ["dotnet", "CVScreener.API.dll"]
