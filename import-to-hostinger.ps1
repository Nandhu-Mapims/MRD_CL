# MongoDB Migration Script - Import to Hostinger
# This script imports the exported MongoDB backup to Hostinger

param(
    [Parameter(Mandatory=$true)]
    [string]$HostingerHost,
    
    [Parameter(Mandatory=$false)]
    [string]$HostingerPort = "27017",
    
    [Parameter(Mandatory=$false)]
    [string]$MongoUser = "admin",
    
    [Parameter(Mandatory=$true)]
    [string]$MongoPassword,
    
    [Parameter(Mandatory=$false)]
    [string]$DatabaseName = "mrd_audit",
    
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = "mongodb-backup-full\mrd_audit",
    
    [switch]$DropExisting = $false
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "MongoDB Data Import to Hostinger" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Validate backup path
if (-not (Test-Path $BackupPath)) {
    Write-Host "âŒ Error: Backup directory not found: $BackupPath" -ForegroundColor Red
    Write-Host "   Please ensure the backup files are in the correct location." -ForegroundColor Yellow
    exit 1
}

Write-Host "ðŸ“Š Import Configuration:" -ForegroundColor Cyan
Write-Host "   Host: $HostingerHost" -ForegroundColor Gray
Write-Host "   Port: $HostingerPort" -ForegroundColor Gray
Write-Host "   Database: $DatabaseName" -ForegroundColor Gray
Write-Host "   Backup Path: $BackupPath" -ForegroundColor Gray
if ($DropExisting) {
    Write-Host "   âš ï¸  Will DROP existing collections!" -ForegroundColor Red
}
Write-Host ""

# Build mongorestore command
$restorePath = Resolve-Path $BackupPath
$restoreCommand = "mongorestore --host $HostingerHost --port $HostingerPort --username $MongoUser --password "$MongoPassword" --authenticationDatabase admin --db $DatabaseName"

if ($DropExisting) {
    $restoreCommand += " --drop"
}

$restoreCommand += " "$restorePath""

Write-Host "ðŸ”„ Starting import..." -ForegroundColor Yellow
Write-Host ""

# Execute mongorestore
try {
    Invoke-Expression $restoreCommand
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "âœ… Import Successful!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Your MongoDB data has been successfully imported to Hostinger." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "âŒ Import failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "âŒ Error during import: $_" -ForegroundColor Red
    exit 1
}
