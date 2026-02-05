# Troubleshoot Login 500 Error
Write-Host "`n🔍 Troubleshooting Login 500 Error...`n" -ForegroundColor Cyan

# 1. Check if backend container is running
Write-Host "1. Checking backend container..." -ForegroundColor Yellow
$backendRunning = docker ps --filter "name=mrd-backend" --format "{{.Names}}" 2>&1
if ($backendRunning -match "mrd-backend") {
    Write-Host "   ✅ Backend container is running" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend container is NOT running" -ForegroundColor Red
    Write-Host "   Run: docker-compose up -d backend" -ForegroundColor Yellow
    exit 1
}

# 2. Check MongoDB connection
Write-Host "`n2. Checking MongoDB connection..." -ForegroundColor Yellow
$mongoRunning = docker ps --filter "name=mrd-mongodb" --format "{{.Names}}" 2>&1
if ($mongoRunning -match "mrd-mongodb") {
    Write-Host "   ✅ MongoDB container is running" -ForegroundColor Green
    
    # Test MongoDB connectivity from backend
    Write-Host "   Testing MongoDB connection from backend..." -ForegroundColor Gray
    $mongoTest = docker exec mrd-backend node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://admin:changeme@mongodb:27017/mrd_audit?authSource=admin', {serverSelectionTimeoutMS: 3000}).then(() => {console.log('Connected'); process.exit(0);}).catch(e => {console.log('Failed:', e.message); process.exit(1);});" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Backend can connect to MongoDB" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend CANNOT connect to MongoDB" -ForegroundColor Red
        Write-Host "   Error: $mongoTest" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ MongoDB container is NOT running" -ForegroundColor Red
    Write-Host "   Run: docker-compose up -d mongodb" -ForegroundColor Yellow
}

# 3. Check backend logs for errors
Write-Host "`n3. Checking recent backend logs (last 20 lines)..." -ForegroundColor Yellow
$logs = docker logs mrd-backend --tail 20 2>&1
if ($logs) {
    Write-Host "   Recent logs:" -ForegroundColor Gray
    $logs | ForEach-Object { 
        if ($_ -match "error|Error|ERROR|failed|Failed|FAILED") {
            Write-Host "   $_" -ForegroundColor Red
        } elseif ($_ -match "MongoDB|connected|Connected") {
            Write-Host "   $_" -ForegroundColor Green
        } else {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   No logs available" -ForegroundColor Gray
}

# 4. Check environment variables
Write-Host "`n4. Checking environment variables..." -ForegroundColor Yellow
$envCheck = docker exec mrd-backend printenv | Select-String -Pattern "JWT_SECRET|MONGO_|NODE_ENV" 2>&1
if ($envCheck) {
    $envCheck | ForEach-Object {
        if ($_ -match "JWT_SECRET") {
            $val = ($_ -split '=')[1]
            if ($val -and $val.Length -gt 20) {
                Write-Host "   ✅ JWT_SECRET is set (length: $($val.Length))" -ForegroundColor Green
            } else {
                Write-Host "   ❌ JWT_SECRET is missing or too short" -ForegroundColor Red
            }
        } elseif ($_ -match "MONGO_HOST") {
            Write-Host "   $_" -ForegroundColor Gray
        } elseif ($_ -match "MONGO_ROOT") {
            Write-Host "   $_" -ForegroundColor Gray
        } else {
            Write-Host "   $_" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ⚠️  Could not check environment variables" -ForegroundColor Yellow
}

# 5. Test login endpoint directly
Write-Host "`n5. Testing login endpoint..." -ForegroundColor Yellow
$testLogin = docker exec mrd-backend curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"test@test.com\",\"password\":\"test\"}' 2>&1
if ($testLogin) {
    Write-Host "   Response: $testLogin" -ForegroundColor Gray
    if ($testLogin -match "500|Server error") {
        Write-Host "   ❌ Login endpoint returns 500 error" -ForegroundColor Red
    } elseif ($testLogin -match "401|Invalid credentials") {
        Write-Host "   ✅ Login endpoint is working (returns expected 401 for invalid credentials)" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Could not test login endpoint" -ForegroundColor Yellow
}

# 6. Recommendations
Write-Host "`n📋 Recommendations:" -ForegroundColor Cyan
Write-Host "   1. Restart backend: docker-compose restart backend" -ForegroundColor White
Write-Host "   2. Check MongoDB logs: docker-compose logs mongodb" -ForegroundColor White
Write-Host "   3. Check backend logs: docker-compose logs backend" -ForegroundColor White
Write-Host "   4. Verify .env file has JWT_SECRET set" -ForegroundColor White
Write-Host "   5. Ensure MongoDB is healthy: docker-compose ps" -ForegroundColor White
Write-Host ""
