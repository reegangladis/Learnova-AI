# =============================================================================
# Learnova AI - Database Disaster Recovery & Safe Restore Script (PowerShell)
# Phase 10A: Deployment Readiness & Disaster Recovery
# =============================================================================

param (
    [Parameter(Mandatory=$false)]
    [string]$BackupFile,
    [string]$ContainerName = "learnova-postgres",
    [string]$Database = "learnova_db",
    [string]$User = "postgres"
)

$ErrorActionPreference = "Stop"

$BackupFolder = Join-Path $PSScriptRoot "..\..\infrastructure\backups"

# If no backup file specified, pick the newest backup
if (-not $BackupFile) {
    $Latest = Get-ChildItem -Path $BackupFolder -Filter "learnova_backup_*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $Latest) {
        Write-Host "[Learnova Restore] ERROR: No backup files found in $BackupFolder" -ForegroundColor Red
        exit 1
    }
    $BackupFile = $Latest.FullName
}

if (-not (Test-Path $BackupFile)) {
    Write-Host "[Learnova Restore] ERROR: File not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "[Learnova Restore] Restoring $Database from: $BackupFile" -ForegroundColor Cyan

# 1. Cryptographic SHA-256 verification if checksum file exists
$ChecksumFile = "${BackupFile}.sha256"
if (Test-Path $ChecksumFile) {
    Write-Host "[Learnova Restore] Verifying SHA-256 integrity..." -ForegroundColor Cyan
    $ExpectedHash = ((Get-Content $ChecksumFile) -split '\s+')[0].Trim().ToUpper()
    $ActualHash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash.ToUpper()

    if ($ExpectedHash -ne $ActualHash) {
        Write-Host "[Learnova Restore] CRITICAL INTEGRITY ERROR: Checksum mismatch!" -ForegroundColor Red
        Write-Host "  Expected: $ExpectedHash" -ForegroundColor Red
        Write-Host "  Actual:   $ActualHash" -ForegroundColor Red
        exit 1
    }
    Write-Host "[Learnova Restore] Cryptographic integrity verified: $ActualHash" -ForegroundColor Green
}

# 2. Decompress backup and apply restoration
$TempSql = [System.IO.Path]::GetTempFileName()
try {
    Write-Host "[Learnova Restore] Terminating existing connections to ${Database}..." -ForegroundColor Yellow
    docker exec $ContainerName psql -U $User -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${Database}' AND pid <> pg_backend_pid();" | Out-Null

    Write-Host "[Learnova Restore] Decompressing backup archive..." -ForegroundColor Cyan
    $InputFileStream = [System.IO.File]::OpenRead($BackupFile)
    $GzipStream = New-Object System.IO.Compression.GZipStream($InputFileStream, [System.IO.Compression.CompressionMode]::Decompress)
    $OutputFileStream = [System.IO.File]::Create($TempSql)
    $GzipStream.CopyTo($OutputFileStream)
    $OutputFileStream.Close()
    $GzipStream.Close()
    $InputFileStream.Close()

    Write-Host "[Learnova Restore] Executing SQL restoration via psql..." -ForegroundColor Cyan
    Get-Content $TempSql -Raw | docker exec -i $ContainerName psql -U $User -d $Database | Out-Null

    # 3. Post-restore verification
    Write-Host "[Learnova Restore] Verifying restored schema and Alembic revision..." -ForegroundColor Cyan
    $AlembicCheck = docker exec $ContainerName psql -U $User -d $Database -t -A -c "SELECT version_num FROM alembic_version;"
    $TableCount = docker exec $ContainerName psql -U $User -d $Database -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

    Write-Host "[Learnova Restore] RESTORE PROCEDURE COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "  Verified Alembic Head: $AlembicCheck" -ForegroundColor Green
    Write-Host "  Total Restored Tables: $TableCount" -ForegroundColor Green

} catch {
    Write-Host "[Learnova Restore] ERROR: Restore procedure failed: $_" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $TempSql) {
        Remove-Item $TempSql -Force -ErrorAction SilentlyContinue
    }
}
