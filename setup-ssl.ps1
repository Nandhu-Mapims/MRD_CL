# Setup SSL Certificates for Nginx
Write-Host "`n🔐 Setting up SSL certificates for Nginx...`n" -ForegroundColor Cyan

# Create SSL directory if it doesn't exist
$sslDir = "nginx\ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
    Write-Host "✅ Created directory: $sslDir" -ForegroundColor Green
}

# Check if certificates already exist
if ((Test-Path "$sslDir\cert.pem") -and (Test-Path "$sslDir\key.pem")) {
    Write-Host "⚠️  SSL certificates already exist" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to regenerate them? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Skipping SSL certificate generation" -ForegroundColor Yellow
        exit 0
    }
}

# Check if OpenSSL is available
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
if (-not $opensslPath) {
    Write-Host "❌ OpenSSL not found. Installing via Chocolatey or manual installation required." -ForegroundColor Red
    Write-Host "`nOption 1: Install via Chocolatey:" -ForegroundColor Yellow
    Write-Host "   choco install openssl" -ForegroundColor White
    Write-Host "`nOption 2: Download from:" -ForegroundColor Yellow
    Write-Host "   https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "`nOption 3: Use Git Bash (if Git is installed):" -ForegroundColor Yellow
    Write-Host "   Run the deploy.sh script instead" -ForegroundColor White
    exit 1
}

Write-Host "🔑 Generating self-signed SSL certificate..." -ForegroundColor Yellow

# Generate certificate
$certPath = "$sslDir\cert.pem"
$keyPath = "$sslDir\key.pem"

openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout $keyPath `
    -out $certPath `
    -subj "/C=IN/ST=State/L=City/O=Hospital/CN=localhost"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SSL certificate generated successfully!" -ForegroundColor Green
    Write-Host "   Certificate: $certPath" -ForegroundColor Gray
    Write-Host "   Private Key: $keyPath" -ForegroundColor Gray
    Write-Host "`n⚠️  This is a self-signed certificate for development/testing." -ForegroundColor Yellow
    Write-Host "   For production, use Let's Encrypt or your provider's certificates." -ForegroundColor Yellow
} else {
    Write-Host "❌ Failed to generate SSL certificate" -ForegroundColor Red
    exit 1
}
