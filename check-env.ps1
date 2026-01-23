# Check .env file for Docker requirements
Write-Host "`n📋 Checking .env file for Docker requirements...`n"

$required = @('MONGO_ROOT_USERNAME', 'MONGO_ROOT_PASSWORD', 'MONGO_DATABASE', 'CORS_ORIGIN', 'API_URL')

if (Test-Path .env) {
    $content = Get-Content .env
    $missing = @()
    
    foreach ($var in $required) {
        $found = $false
        foreach ($line in $content) {
            if ($line -match "^$var=") {
                $found = $true
                break
            }
        }
        if (-not $found) {
            $missing += $var
        }
    }
    
    if ($missing.Count -eq 0) {
        Write-Host "✅ All required Docker variables are set!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Missing variables:" -ForegroundColor Yellow
        $missing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
        Write-Host "`n📝 See ENV_SETUP.md for details" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}
