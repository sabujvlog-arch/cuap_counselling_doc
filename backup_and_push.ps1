# CUAP WCCMS: Database Backup and Git Push Pipeline Script
# Purpose: Safely snapshot the SQLite database and sync repository changes to GitHub.

# 1. Initialize Directories
$backupDir = Join-Path $PSScriptRoot "db_backups"
if (!(Test-Path -Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Write-Host "[INIT] Created backups directory: $backupDir" -ForegroundColor Gray
}

# 2. Setup File Paths
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dbFile = Join-Path $PSScriptRoot "backend\wccms.db"
$backupFile = Join-Path $backupDir "wccms_backup_$timestamp.db"

# 3. Snapshot SQLite Database File
if (Test-Path -Path $dbFile) {
    Copy-Item -Path $dbFile -Destination $backupFile -Force
    Write-Host "[SUCCESS] Database backup saved to: db_backups\wccms_backup_$timestamp.db" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Database file 'backend\wccms.db' was not found! Skipping copy." -ForegroundColor Yellow
}

# 4. Git Push Sequence
Write-Host "[GIT] Starting sync pipeline..." -ForegroundColor Cyan

# Stage files (including db_backups thanks to .gitignore overrides)
git add .

# Check if there are changes staged
$status = git status --porcelain
if ([string]::IsNullOrEmpty($status)) {
    Write-Host "[GIT] Working directory is clean. Nothing to commit." -ForegroundColor Yellow
} else {
    git commit -m "Automated backup: $timestamp"
    Write-Host "[GIT] Changes committed successfully." -ForegroundColor Green
}

Write-Host "[GIT] Pushing repository updates to GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Sync complete! Code and database backups pushed to GitHub." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Git push failed. Please verify SSH/PAT credentials configuration." -ForegroundColor Red
}
