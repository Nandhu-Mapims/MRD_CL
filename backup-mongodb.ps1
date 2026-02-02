# MongoDB Backup Script - Creates/updates backup files in mongodb-backup-full
# Requires: MongoDB tools (mongodump) installed and in PATH

param(
    [Parameter(Mandatory = $false)]
    [string]$Host = $env:MONGO_HOST ?? "localhost",

    [Parameter(Mandatory = $false)]
    [string]$Port = $env:MONGO_PORT ?? "27017",

    [Parameter(Mandatory = $false)]
    [string]$Database = $env:MONGO_DATABASE ?? "mrd_audit",

    [Parameter(Mandatory = $false)]
    [string]$User = $env:MONGO_ROOT_USERNAME ?? "admin",

    [Parameter(Mandatory = $false)]
    [string]$Password = $env:MONGO_ROOT_PASSWORD ?? "",

    [Parameter(Mandatory = $false)]
    [string]$OutDir = "mongodb-backup-full"
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MongoDB Backup (Update backup files)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$outPath = Join-Path (Get-Location) $OutDir
if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

Write-Host "Backup Configuration:" -ForegroundColor Cyan
Write-Host "  Host: $Host" -ForegroundColor Gray
Write-Host "  Port: $Port" -ForegroundColor Gray
Write-Host "  Database: $Database" -ForegroundColor Gray
Write-Host "  Output: $OutDir\$Database" -ForegroundColor Gray
Write-Host ""

$mongodumpArgs = @(
    "--host", $Host,
    "--port", $Port,
    "--db", $Database,
    "--out", $outPath
)

if ($Password) {
    $mongodumpArgs += @("--username", $User, "--password", $Password, "--authenticationDatabase", "admin")
}

Write-Host "Running mongodump..." -ForegroundColor Yellow
try {
    & mongodump @mongodumpArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "Backup completed successfully" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "  Location: $OutDir\$Database" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "Backup failed. Check MongoDB is running and credentials are correct." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Ensure mongodump is installed (MongoDB Database Tools)." -ForegroundColor Yellow
    exit 1
}
