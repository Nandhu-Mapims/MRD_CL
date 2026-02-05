# Fix MongoDB Connection Issue
Write-Host "`n🔧 Fixing MongoDB Connection Issue...`n" -ForegroundColor Cyan

# Step 1: Check current status
Write-Host "1. Checking current container status..." -ForegroundColor Yellow
docker-compose ps

# Step 2: Stop all services
Write-Host "`n2. Stopping all services..." -ForegroundColor Yellow
docker-compose down
Start-Sleep -Seconds 2

# Step 3: Check .env file
Write-Host "`n3. Verifying .env configuration..." -ForegroundColor Yellow
if (Test-Path .env) {
    $envContent = Get-Content .env
    $mongoHost = $envContent | Where-Object { $_ -match "^MONGO_HOST=" }
    if (-not $mongoHost) {
        Write-Host "   ⚠️  MONGO_HOST not found in .env" -ForegroundColor Yellow
        Write-Host "   Adding MONGO_HOST=mongodb to .env..." -ForegroundColor Gray
        Add-Content -Path .env -Value "`n# MongoDB Host (use 'mongodb' for Docker, 'localhost' for local)" -Encoding utf8
        Add-Content -Path .env -Value "MONGO_HOST=mongodb" -Encoding utf8
        Write-Host "   ✅ Added MONGO_HOST=mongodb" -ForegroundColor Green
    } else {
        Write-Host "   ✅ MONGO_HOST is set" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Run: .\setup-env.ps1" -ForegroundColor Yellow
    exit 1
}

# Step 4: Start MongoDB first
Write-Host "`n4. Starting MongoDB..." -ForegroundColor Yellow
docker-compose up -d mongodb
Start-Sleep -Seconds 5

# Step 5: Wait for MongoDB to be healthy
Write-Host "`n5. Waiting for MongoDB to be healthy..." -ForegroundColor Yellow
$maxWait = 60
$waited = 0
$healthy = $false

while ($waited -lt $maxWait) {
    $status = docker inspect mrd-mongodb --format='{{.State.Health.Status}}' 2>&1
    if ($status -eq "healthy") {
        Write-Host "   ✅ MongoDB is healthy!" -ForegroundColor Green
        $healthy = $true
        break
    }
    Write-Host "   Waiting... ($waited/$maxWait seconds)" -ForegroundColor Gray
    Start-Sleep -Seconds 2
    $waited += 2
}

if (-not $healthy) {
    Write-Host "   ⚠️  MongoDB did not become healthy within $maxWait seconds" -ForegroundColor Yellow
    Write-Host "   Checking MongoDB logs..." -ForegroundColor Yellow
    docker-compose logs mongodb --tail 20
}

# Step 6: Rebuild and start backend
Write-Host "`n6. Rebuilding and starting backend..." -ForegroundColor Yellow
docker-compose build backend
docker-compose up -d backend
Start-Sleep -Seconds 3

# Step 7: Check backend logs
Write-Host "`n7. Checking backend logs for MongoDB connection..." -ForegroundColor Yellow
$logs = docker-compose logs backend --tail 30
$logs | ForEach-Object {
    if ($_ -match "MongoDB connected|✅ MongoDB") {
        Write-Host "   $_" -ForegroundColor Green
    } elseif ($_ -match "error|Error|ERROR|failed|Failed") {
        Write-Host "   $_" -ForegroundColor Red
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

# Step 8: Final status check
Write-Host "`n8. Final container status:" -ForegroundColor Yellow
docker-compose ps

Write-Host "`n✅ Fix complete!" -ForegroundColor Green
Write-Host "`nIf MongoDB still doesn't connect:" -ForegroundColor Cyan
Write-Host "   1. Check MongoDB logs: docker-compose logs mongodb" -ForegroundColor White
Write-Host "   2. Check backend logs: docker-compose logs backend" -ForegroundColor White
Write-Host "   3. Verify .env file has correct credentials" -ForegroundColor White
Write-Host "   4. Run: .\check-env-config.ps1" -ForegroundColor White
Write-Host ""
