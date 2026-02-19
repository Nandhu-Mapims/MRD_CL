# Run the MRD app in Docker and optionally seed the DB for MongoDB Compass.
# Usage: .\run-docker.ps1          -> start stack only
#        .\run-docker.ps1 -Seed     -> start stack then run seed (for Compass)

param([switch]$Seed)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Test-Path (Join-Path $root ".env"))) {
  Write-Host "Creating .env from env.example (set JWT_SECRET and MONGO_* as needed)." -ForegroundColor Yellow
  Copy-Item (Join-Path $root "env.example") (Join-Path $root ".env")
}

Write-Host "Starting Docker stack (mongo, backend, frontend)..." -ForegroundColor Cyan
Set-Location $root
docker compose up -d

Write-Host "Waiting for backend to be ready..." -ForegroundColor Cyan
$max = 60
for ($i = 0; $i -lt $max; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:5000/" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { break }
  } catch {}
  Start-Sleep -Seconds 2
}
if ($i -ge $max) {
  Write-Host "Backend did not become ready in time. Check: docker compose logs backend" -ForegroundColor Yellow
  exit 1
}

if ($Seed) {
  Write-Host "Seeding database (creates collections and data for Compass)..." -ForegroundColor Cyan
  docker compose exec backend npm run reset-all
  Write-Host ""
  Write-Host "Compass: connect to mongodb://admin:changeme@localhost:27017/mrd_audit?authSource=admin" -ForegroundColor Green
}

Write-Host ""
Write-Host "App:  http://localhost:3000" -ForegroundColor Green
Write-Host "API:  http://localhost:5000" -ForegroundColor Green
Write-Host "Mongo: localhost:27017 (Compass: admin / changeme, db: mrd_audit)" -ForegroundColor Green
Write-Host "To seed later: docker compose exec backend npm run reset-all" -ForegroundColor DarkGray
