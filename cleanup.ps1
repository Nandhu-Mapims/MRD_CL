# Cleanup script to remove unwanted files and directories
Write-Host "🧹 Cleaning up unwanted files and directories...`n" -ForegroundColor Cyan

$removed = @()
$failed = @()

# Remove frontend/dist (build artifact)
if (Test-Path "frontend\dist") {
    try {
        Remove-Item -Path "frontend\dist" -Recurse -Force
        $removed += "frontend\dist"
        Write-Host "✅ Removed frontend\dist" -ForegroundColor Green
    } catch {
        $failed += "frontend\dist"
        Write-Host "❌ Failed to remove frontend\dist: $_" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  frontend\dist not found (already removed)" -ForegroundColor Gray
}

# Remove mongodb-backup
if (Test-Path "mongodb-backup") {
    try {
        Remove-Item -Path "mongodb-backup" -Recurse -Force
        $removed += "mongodb-backup"
        Write-Host "✅ Removed mongodb-backup" -ForegroundColor Green
    } catch {
        $failed += "mongodb-backup"
        Write-Host "❌ Failed to remove mongodb-backup: $_" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  mongodb-backup not found (already removed)" -ForegroundColor Gray
}

# Remove mongodb-backup-full
if (Test-Path "mongodb-backup-full") {
    try {
        Remove-Item -Path "mongodb-backup-full" -Recurse -Force
        $removed += "mongodb-backup-full"
        Write-Host "✅ Removed mongodb-backup-full" -ForegroundColor Green
    } catch {
        $failed += "mongodb-backup-full"
        Write-Host "❌ Failed to remove mongodb-backup-full: $_" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️  mongodb-backup-full not found (already removed)" -ForegroundColor Gray
}

# Summary
Write-Host "`n📊 Cleanup Summary:" -ForegroundColor Cyan
if ($removed.Count -gt 0) {
    Write-Host "   Removed: $($removed.Count) item(s)" -ForegroundColor Green
    $removed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
}
if ($failed.Count -gt 0) {
    Write-Host "   Failed: $($failed.Count) item(s)" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
}
if ($removed.Count -eq 0 -and $failed.Count -eq 0) {
    Write-Host "   No items to remove" -ForegroundColor Yellow
}

Write-Host "`n✅ Cleanup completed!`n" -ForegroundColor Green
