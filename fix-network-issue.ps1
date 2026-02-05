# Fix Docker Network DNS Issue
Write-Host "`n🔧 Fixing Docker Network DNS Issue...`n" -ForegroundColor Cyan

# Step 1: Stop all containers
Write-Host "1. Stopping all containers..." -ForegroundColor Yellow
docker-compose down
Start-Sleep -Seconds 3

# Step 2: Remove old network if it exists (to recreate it)
Write-Host "`n2. Cleaning up old network..." -ForegroundColor Yellow
docker network rm mrd-network 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Removed old network" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Network doesn't exist or already removed" -ForegroundColor Gray
}
Start-Sleep -Seconds 2

# Step 3: Start MongoDB first
Write-Host "`n3. Starting MongoDB container..." -ForegroundColor Yellow
docker-compose up -d mongodb
Start-Sleep -Seconds 5

# Step 4: Verify MongoDB is running
Write-Host "`n4. Verifying MongoDB is running..." -ForegroundColor Yellow
$mongoStatus = docker inspect mrd-mongodb --format='{{.State.Status}}' 2>&1
if ($mongoStatus -eq "running") {
    Write-Host "   ✅ MongoDB is running" -ForegroundColor Green
    
    # Wait for MongoDB to be healthy
    Write-Host "   Waiting for MongoDB to be healthy..." -ForegroundColor Gray
    $maxWait = 60
    $waited = 0
    $healthy = $false
    
    while ($waited -lt $maxWait) {
        $health = docker inspect mrd-mongodb --format='{{.State.Health.Status}}' 2>&1
        if ($health -eq "healthy") {
            Write-Host "   ✅ MongoDB is healthy!" -ForegroundColor Green
            $healthy = $true
            break
        }
        Write-Host "   Status: $health (waiting...)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
        $waited += 2
    }
    
    if (-not $healthy) {
        Write-Host "   ⚠️  MongoDB did not become healthy, but continuing..." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ MongoDB is NOT running (Status: $mongoStatus)" -ForegroundColor Red
    Write-Host "   Check logs: docker-compose logs mongodb" -ForegroundColor Yellow
    exit 1
}

# Step 5: Verify network exists and MongoDB is on it
Write-Host "`n5. Verifying network configuration..." -ForegroundColor Yellow
$networkExists = docker network inspect mrd-network 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ mrd-network exists" -ForegroundColor Green
    
    # Check if MongoDB is on the network
    $mongoOnNetwork = docker network inspect mrd-network --format='{{range .Containers}}{{.Name}} {{end}}' 2>&1
    if ($mongoOnNetwork -match "mrd-mongodb") {
        Write-Host "   ✅ MongoDB is on mrd-network" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  MongoDB might not be on network yet" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ mrd-network does not exist!" -ForegroundColor Red
    Write-Host "   Creating network..." -ForegroundColor Yellow
    docker network create mrd-network
}

# Step 6: Rebuild and start backend
Write-Host "`n6. Rebuilding and starting backend..." -ForegroundColor Yellow
docker-compose build backend
docker-compose up -d backend
Start-Sleep -Seconds 5

# Step 7: Test DNS resolution from backend
Write-Host "`n7. Testing DNS resolution from backend..." -ForegroundColor Yellow
$backendStatus = docker inspect mrd-backend --format='{{.State.Status}}' 2>&1
if ($backendStatus -eq "running") {
    # Test if backend can resolve mongodb hostname
    $dnsTest = docker exec mrd-backend getent hosts mongodb 2>&1
    if ($LASTEXITCODE -eq 0 -and $dnsTest -match "mongodb") {
        Write-Host "   ✅ Backend can resolve 'mongodb' hostname" -ForegroundColor Green
        Write-Host "   $dnsTest" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Backend CANNOT resolve 'mongodb' hostname" -ForegroundColor Red
        Write-Host "   Trying alternative: ping test..." -ForegroundColor Yellow
        
        # Try ping
        $pingTest = docker exec mrd-backend ping -c 1 mongodb 2>&1
        if ($pingTest -match "1 packets transmitted") {
            Write-Host "   ✅ Backend can ping mongodb" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Backend cannot ping mongodb" -ForegroundColor Red
            Write-Host "   $pingTest" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ❌ Backend is not running" -ForegroundColor Red
}

# Step 8: Check backend logs
Write-Host "`n8. Checking backend logs for MongoDB connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$logs = docker-compose logs backend --tail 20
$mongoConnected = $false
$logs | ForEach-Object {
    if ($_ -match "MongoDB connected successfully|✅ MongoDB") {
        Write-Host "   $_" -ForegroundColor Green
        $mongoConnected = $true
    } elseif ($_ -match "ENOTFOUND|getaddrinfo|connection.*failed") {
        Write-Host "   $_" -ForegroundColor Red
    } elseif ($_ -match "error|Error|ERROR") {
        Write-Host "   $_" -ForegroundColor Yellow
    } else {
        Write-Host "   $_" -ForegroundColor Gray
    }
}

# Step 9: Final status
Write-Host "`n9. Final container status:" -ForegroundColor Yellow
docker-compose ps

# Summary
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
if ($mongoConnected) {
    Write-Host "   ✅ MongoDB connection successful!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MongoDB connection may still be failing" -ForegroundColor Yellow
    Write-Host "   Check logs: docker-compose logs backend" -ForegroundColor White
}

Write-Host "`n💡 If issue persists:" -ForegroundColor Cyan
Write-Host "   1. Run: .\diagnose-network.ps1" -ForegroundColor White
Write-Host "   2. Check: docker network inspect mrd-network" -ForegroundColor White
Write-Host "   3. Verify: docker-compose ps (both containers should be running)" -ForegroundColor White
Write-Host "   4. Restart: docker-compose restart" -ForegroundColor White
Write-Host ""
