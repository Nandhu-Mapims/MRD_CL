# Check .env Configuration for MongoDB
Write-Host "`n🔍 Checking .env Configuration (lines 3-20)...`n" -ForegroundColor Cyan

if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Run: .\setup-env.ps1" -ForegroundColor Yellow
    exit 1
}

$envContent = Get-Content .env
$lines3to20 = $envContent | Select-Object -Skip 2 -First 18

Write-Host "📋 .env file content (lines 3-20):" -ForegroundColor Yellow
$lines3to20 | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }

Write-Host "`n🔍 Checking MongoDB-related variables..." -ForegroundColor Yellow

$issues = @()
$warnings = @()

# Check MONGO_ROOT_USERNAME
$mongoUser = $envContent | Where-Object { $_ -match "^MONGO_ROOT_USERNAME=" }
if ($mongoUser) {
    $userValue = ($mongoUser -split '=')[1]
    if ($userValue -and $userValue -ne 'changeme') {
        Write-Host "   ✅ MONGO_ROOT_USERNAME = $userValue" -ForegroundColor Green
    } elseif ($userValue -eq 'changeme') {
        Write-Host "   ⚠️  MONGO_ROOT_USERNAME = changeme (default - should be changed for production)" -ForegroundColor Yellow
        $warnings += "MONGO_ROOT_USERNAME is still 'changeme'"
    } else {
        Write-Host "   ❌ MONGO_ROOT_USERNAME is empty" -ForegroundColor Red
        $issues += "MONGO_ROOT_USERNAME is empty"
    }
} else {
    Write-Host "   ❌ MONGO_ROOT_USERNAME not found" -ForegroundColor Red
    $issues += "MONGO_ROOT_USERNAME missing"
}

# Check MONGO_ROOT_PASSWORD
$mongoPass = $envContent | Where-Object { $_ -match "^MONGO_ROOT_PASSWORD=" }
if ($mongoPass) {
    $passValue = ($mongoPass -split '=')[1]
    if ($passValue -and $passValue.Length -ge 8 -and $passValue -ne 'changeme') {
        Write-Host "   ✅ MONGO_ROOT_PASSWORD is set (length: $($passValue.Length))" -ForegroundColor Green
    } elseif ($passValue -eq 'changeme') {
        Write-Host "   ⚠️  MONGO_ROOT_PASSWORD = changeme (default - MUST be changed for production)" -ForegroundColor Yellow
        $warnings += "MONGO_ROOT_PASSWORD is still 'changeme'"
    } elseif ($passValue -and $passValue.Length -lt 8) {
        Write-Host "   ⚠️  MONGO_ROOT_PASSWORD is too short (length: $($passValue.Length))" -ForegroundColor Yellow
        $warnings += "MONGO_ROOT_PASSWORD is too short"
    } else {
        Write-Host "   ❌ MONGO_ROOT_PASSWORD is empty" -ForegroundColor Red
        $issues += "MONGO_ROOT_PASSWORD is empty"
    }
} else {
    Write-Host "   ❌ MONGO_ROOT_PASSWORD not found" -ForegroundColor Red
    $issues += "MONGO_ROOT_PASSWORD missing"
}

# Check MONGO_DATABASE
$mongoDb = $envContent | Where-Object { $_ -match "^MONGO_DATABASE=" }
if ($mongoDb) {
    $dbValue = ($mongoDb -split '=')[1]
    Write-Host "   ✅ MONGO_DATABASE = $dbValue" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MONGO_DATABASE not found (will default to 'mrd_audit')" -ForegroundColor Yellow
}

# Check MONGO_HOST
$mongoHost = $envContent | Where-Object { $_ -match "^MONGO_HOST=" }
if ($mongoHost) {
    $hostValue = ($mongoHost -split '=')[1]
    Write-Host "   ✅ MONGO_HOST = $hostValue" -ForegroundColor Green
    if ($hostValue -ne 'mongodb' -and $hostValue -ne 'localhost') {
        Write-Host "   ⚠️  MONGO_HOST is '$hostValue' - should be 'mongodb' for Docker or 'localhost' for local" -ForegroundColor Yellow
        $warnings += "MONGO_HOST might be incorrect for Docker"
    }
} else {
    Write-Host "   ⚠️  MONGO_HOST not found (will default based on NODE_ENV)" -ForegroundColor Yellow
    Write-Host "      For Docker: should be 'mongodb'" -ForegroundColor Gray
    Write-Host "      For local: should be 'localhost'" -ForegroundColor Gray
    $warnings += "MONGO_HOST not explicitly set"
}

# Check MONGO_PORT
$mongoPort = $envContent | Where-Object { $_ -match "^MONGO_PORT=" }
if ($mongoPort) {
    $portValue = ($mongoPort -split '=')[1]
    Write-Host "   ✅ MONGO_PORT = $portValue" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  MONGO_PORT not found (will default to '27017')" -ForegroundColor Gray
}

# Check JWT_SECRET
$jwtSecret = $envContent | Where-Object { $_ -match "^JWT_SECRET=" }
if ($jwtSecret) {
    $jwtValue = ($jwtSecret -split '=')[1]
    if ($jwtValue -and $jwtValue.Length -ge 32 -and $jwtValue -notmatch "your-super-secret") {
        Write-Host "   ✅ JWT_SECRET is set (length: $($jwtValue.Length))" -ForegroundColor Green
    } elseif ($jwtValue -match "your-super-secret") {
        Write-Host "   ❌ JWT_SECRET is still the placeholder value" -ForegroundColor Red
        Write-Host "      Run: .\setup-env.ps1" -ForegroundColor Yellow
        $issues += "JWT_SECRET is placeholder"
    } else {
        Write-Host "   ❌ JWT_SECRET is too short or empty" -ForegroundColor Red
        $issues += "JWT_SECRET invalid"
    }
} else {
    Write-Host "   ❌ JWT_SECRET not found" -ForegroundColor Red
    $issues += "JWT_SECRET missing"
}

# Check NODE_ENV
$nodeEnv = $envContent | Where-Object { $_ -match "^NODE_ENV=" }
if ($nodeEnv) {
    $envValue = ($nodeEnv -split '=')[1]
    Write-Host "   ✅ NODE_ENV = $envValue" -ForegroundColor Green
    if ($envValue -eq 'production') {
        Write-Host "      → Will use 'mongodb' as default hostname" -ForegroundColor Gray
    } else {
        Write-Host "      → Will use 'localhost' as default hostname" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  NODE_ENV not found (will default to 'production' in docker-compose)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
if ($issues.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "   ✅ All critical variables are properly configured!" -ForegroundColor Green
} else {
    if ($issues.Count -gt 0) {
        Write-Host "   ❌ Critical Issues Found:" -ForegroundColor Red
        $issues | ForEach-Object { Write-Host "      - $_" -ForegroundColor Red }
    }
    if ($warnings.Count -gt 0) {
        Write-Host "   ⚠️  Warnings:" -ForegroundColor Yellow
        $warnings | ForEach-Object { Write-Host "      - $_" -ForegroundColor Yellow }
    }
}

# Docker-specific recommendations
Write-Host "`n🐳 Docker Configuration:" -ForegroundColor Cyan
Write-Host "   For Docker deployment, ensure:" -ForegroundColor White
Write-Host "   - MONGO_HOST=mongodb (or leave unset if NODE_ENV=production)" -ForegroundColor Gray
Write-Host "   - MONGO_ROOT_USERNAME matches docker-compose.yml" -ForegroundColor Gray
Write-Host "   - MONGO_ROOT_PASSWORD matches docker-compose.yml" -ForegroundColor Gray
Write-Host ""
