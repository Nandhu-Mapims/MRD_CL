# MongoDB Migration Script - Import to Hostinger
# This script imports the exported MongoDB backup to Hostinger.
# Create/update backup first: .\backup-mongodb.ps1
# See DATABASE_BACKUP.md for full backup/restore docs and collection list.

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
    Write-Host "[ERROR] Backup directory not found: $BackupPath" -ForegroundColor Red
    Write-Host "   Run .\backup-mongodb.ps1 first, or ensure backup files are in the correct location." -ForegroundColor Yellow
    exit 1
}

Write-Host "Import Configuration:" -ForegroundColor Cyan
Write-Host "   Host: $HostingerHost" -ForegroundColor Gray
Write-Host "   Port: $HostingerPort" -ForegroundColor Gray
Write-Host "   Database: $DatabaseName" -ForegroundColor Gray
Write-Host "   Backup Path: $BackupPath" -ForegroundColor Gray
Write-Host "   Collections: users, departments, chiefdoctors, patients, admissions, formtemplates, checklistitems, auditsubmissions, notifications" -ForegroundColor Gray
if ($DropExisting) {
    Write-Host "   [WARNING] Will DROP existing collections before import!" -ForegroundColor Red
}
Write-Host ""

# Build mongorestore command
$restorePath = Resolve-Path $BackupPath
$restoreCommand = "mongorestore --host $HostingerHost --port $HostingerPort --username $MongoUser --password `"$MongoPassword`" --authenticationDatabase admin --db $DatabaseName"

if ($DropExisting) {
    $restoreCommand += " --drop"
}

$restoreCommand += " `"$restorePath`""

Write-Host "Starting import..." -ForegroundColor Yellow
Write-Host ""

# Execute mongorestore
try {
    Invoke-Expression $restoreCommand
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "Import Successful!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "MongoDB data has been successfully imported." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] Import failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Error during import: $_" -ForegroundColor Red
    exit 1
}
