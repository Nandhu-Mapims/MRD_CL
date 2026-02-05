# MongoDB Connection Diagnostic Script
Write-Host "`n🔍 Checking MongoDB Connection Setup...`n" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "1. Checking Docker..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Docker is running" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Docker is not running" -ForegroundColor Red
        Write-Host "   Please start Docker Desktop" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "   ❌ Docker is not available" -ForegroundColor Red
    exit 1
}

# Check if containers are running
Write-Host "`n2. Checking Docker containers..." -ForegroundColor Yellow
$containers = docker-compose ps --format json 2>&1 | ConvertFrom-Json
if ($containers) {
    $mongodb = $containers | Where-Object { $_.Service -eq "mongodb" }
    $backend = $containers | Where-Object { $_.Service -eq "backend" }
    
    if ($mongodb) {
        Write-Host "   ✅ MongoDB container: $($mongodb.State)" -ForegroundColor $(if ($mongodb.State -eq "running") { "Green" } else { "Red" })
        Write-Host "      Name: $($mongodb.Name)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ MongoDB container not found" -ForegroundColor Red
    }
    
    if ($backend) {
        Write-Host "   ✅ Backend container: $($backend.State)" -ForegroundColor $(if ($backend.State -eq "running") { "Green" } else { "Red" })
        Write-Host "      Name: $($backend.Name)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Backend container not found" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  No containers found. Run: docker-compose up -d" -ForegroundColor Yellow
}

# Check .env file
Write-Host "`n3. Checking .env file..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "   ✅ .env file exists" -ForegroundColor Green
    $envContent = Get-Content .env
    $mongoVars = @('MONGO_ROOT_USERNAME', 'MONGO_ROOT_PASSWORD', 'MONGO_DATABASE', 'MONGO_HOST')
    foreach ($var in $mongoVars) {
        $found = $envContent | Where-Object { $_ -match "^$var=" }
        if ($found) {
            $value = ($found -split '=')[1]
            if ($var -eq 'MONGO_ROOT_PASSWORD') {
                Write-Host "      $var = [HIDDEN]" -ForegroundColor Gray
            } else {
                Write-Host "      $var = $value" -ForegroundColor Gray
            }
        } else {
            Write-Host "      ⚠️  $var not set" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
    Write-Host "   Run: .\setup-env.ps1" -ForegroundColor Yellow
}

# Check MongoDB network connectivity
Write-Host "`n4. Testing MongoDB connectivity..." -ForegroundColor Yellow
if ($mongodb -and $mongodb.State -eq "running") {
    try {
        $test = docker exec mrd-mongodb mongosh --eval "db.adminCommand('ping')" --quiet 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ MongoDB is responding" -ForegroundColor Green
        } else {
            Write-Host "   ❌ MongoDB is not responding" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ⚠️  Could not test MongoDB connectivity" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  MongoDB container is not running" -ForegroundColor Yellow
}

# Check backend logs
Write-Host "`n5. Recent backend logs (last 10 lines)..." -ForegroundColor Yellow
try {
    $logs = docker logs mrd-backend --tail 10 2>&1
    if ($logs) {
        $logs | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    } else {
        Write-Host "   No logs available" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Could not retrieve logs" -ForegroundColor Yellow
}

Write-Host "`n📋 Recommendations:" -ForegroundColor Cyan
Write-Host "   1. Ensure MongoDB is running: docker-compose up -d mongodb" -ForegroundColor White
Write-Host "   2. Restart backend: docker-compose restart backend" -ForegroundColor White
Write-Host "   3. Check all services: docker-compose ps" -ForegroundColor White
Write-Host "   4. View backend logs: docker-compose logs backend" -ForegroundColor White
Write-Host "   5. View MongoDB logs: docker-compose logs mongodb" -ForegroundColor White
Write-Host ""
