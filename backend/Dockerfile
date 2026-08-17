FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# Install en_US.UTF-8 locale required by the ONNX StringNormalizer node
RUN apt-get update \
    && apt-get install -y --no-install-recommends locales \
    && sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen \
    && locale-gen \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

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
COPY ml/ /app/ml/
ENTRYPOINT ["dotnet", "CVScreener.API.dll"]
