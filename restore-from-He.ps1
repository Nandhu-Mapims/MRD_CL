# Restore mrd_audit from He folder backup. Drops existing data and loads only He.
# Requires: Docker with container mrd-mongodb (default Compose stack).
# Usage: .\restore-from-He.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$hePath = Join-Path $root "He"
$dbFolder = Join-Path $hePath "mrd_audit"

if (-not (Test-Path $dbFolder)) {
  Write-Host "ERROR: He backup not found at: $dbFolder" -ForegroundColor Red
  exit 1
}

$container = "mrd-mongodb"
$exists = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^\Q$container\E$" -Quiet
if (-not $exists) {
  Write-Host "ERROR: Container '$container' not found. Start the stack: docker compose up -d" -ForegroundColor Red
  exit 1
}

Write-Host "Restoring mrd_audit from He backup (existing data will be dropped)..." -ForegroundColor Cyan
docker cp $dbFolder "${container}:/tmp/He_mrd_audit"
docker exec $container mongorestore --host localhost --port 27017 --username admin --password changeme --authenticationDatabase admin --db mrd_audit --drop /tmp/He_mrd_audit
docker exec $container rm -rf /tmp/He_mrd_audit
Write-Host "Done. Database mrd_audit now contains only He backup data." -ForegroundColor Green
