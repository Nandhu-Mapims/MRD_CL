# Diagnose Docker Network Issue
Write-Host "`n🔍 Diagnosing Docker Network Issue...`n" -ForegroundColor Cyan

# 1. Check if containers are running
Write-Host "1. Checking container status..." -ForegroundColor Yellow
$containers = docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"
Write-Host $containers

# 2. Check MongoDB container
Write-Host "`n2. Checking MongoDB container..." -ForegroundColor Yellow
$mongoStatus = docker inspect mrd-mongodb --format='{{.State.Status}}' 2>&1
if ($mongoStatus -eq "running") {
    Write-Host "   ✅ MongoDB container is running" -ForegroundColor Green
    
    # Check MongoDB network
    $mongoNetworks = docker inspect mrd-mongodb --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}' 2>&1
    Write-Host "   MongoDB networks: $mongoNetworks" -ForegroundColor Gray
    
    # Check MongoDB IP
    $mongoIP = docker inspect mrd-mongodb --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>&1
    Write-Host "   MongoDB IP: $mongoIP" -ForegroundColor Gray
} else {
    Write-Host "   ❌ MongoDB container is NOT running (Status: $mongoStatus)" -ForegroundColor Red
}

# 3. Check Backend container
Write-Host "`n3. Checking Backend container..." -ForegroundColor Yellow
$backendStatus = docker inspect mrd-backend --format='{{.State.Status}}' 2>&1
if ($backendStatus -eq "running") {
    Write-Host "   ✅ Backend container is running" -ForegroundColor Green
    
    # Check Backend network
    $backendNetworks = docker inspect mrd-backend --format='{{range $key, $value := .NetworkSettings.Networks}}{{$key}} {{end}}' 2>&1
    Write-Host "   Backend networks: $backendNetworks" -ForegroundColor Gray
    
    # Check Backend IP
    $backendIP = docker inspect mrd-backend --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>&1
    Write-Host "   Backend IP: $backendIP" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Backend container is NOT running (Status: $backendStatus)" -ForegroundColor Red
}

# 4. Test DNS resolution from backend
Write-Host "`n4. Testing DNS resolution from backend..." -ForegroundColor Yellow
if ($backendStatus -eq "running") {
    $dnsTest = docker exec mrd-backend nslookup mongodb 2>&1
    if ($dnsTest -match "Name:") {
        Write-Host "   ✅ DNS resolution works" -ForegroundColor Green
        Write-Host "   $dnsTest" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ DNS resolution FAILED" -ForegroundColor Red
        Write-Host "   $dnsTest" -ForegroundColor Red
    }
    
    # Test ping
    Write-Host "`n   Testing connectivity..." -ForegroundColor Gray
    $pingTest = docker exec mrd-backend ping -c 2 mongodb 2>&1
    if ($pingTest -match "0% packet loss" -or $pingTest -match "2 packets transmitted") {
        Write-Host "   ✅ Can ping mongodb" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Cannot ping mongodb" -ForegroundColor Red
        Write-Host "   $pingTest" -ForegroundColor Red
    }
}

# 5. Check Docker networks
Write-Host "`n5. Checking Docker networks..." -ForegroundColor Yellow
$networks = docker network ls --format "table {{.Name}}\t{{.Driver}}"
Write-Host $networks

# Check if mrd-network exists
$mrdNetwork = docker network inspect mrd-network 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ mrd-network exists" -ForegroundColor Green
    Write-Host "   Network details:" -ForegroundColor Gray
    $mrdNetwork | ConvertFrom-Json | Select-Object -ExpandProperty Containers | ForEach-Object {
        Write-Host "      - $($_.Name): $($_.IPv4Address)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ mrd-network does NOT exist!" -ForegroundColor Red
}

# 6. Check docker-compose services
Write-Host "`n6. Checking docker-compose services..." -ForegroundColor Yellow
docker-compose ps

Write-Host "`n📋 Recommendations:" -ForegroundColor Cyan
Write-Host "   1. If containers are not on same network: docker-compose down && docker-compose up -d" -ForegroundColor White
Write-Host "   2. If MongoDB is not running: docker-compose up -d mongodb" -ForegroundColor White
Write-Host "   3. If network doesn't exist: docker network create mrd-network" -ForegroundColor White
Write-Host "   4. Restart all services: docker-compose restart" -ForegroundColor White
Write-Host ""
