# =============================================================================
# Learnova AI - Automated Database Backup Script (PowerShell)
# Phase 10A: Deployment Readiness & Disaster Recovery
# =============================================================================

param (
    [string]$BackupDir = "infrastructure/backups",
    [int]$RetentionDays = 7,
    [string]$ContainerName = "learnova-postgres",
    [string]$Database = "learnova_db",
    [string]$User = "postgres"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFolder = Join-Path $PSScriptRoot "..\..\$BackupDir"

if (-not (Test-Path $BackupFolder)) {
    New-Item -ItemType Directory -Path $BackupFolder -Force | Out-Null
}

$BackupFile = Join-Path $BackupFolder "learnova_backup_${Timestamp}.sql.gz"
$ChecksumFile = "${BackupFile}.sha256"

Write-Host "[Learnova Backup] Starting backup of ${Database} from ${ContainerName}..." -ForegroundColor Cyan

# Execute pg_dump inside container and compress via gzip
$DumpCmd = "docker exec ${ContainerName} pg_dump -U ${User} -d ${Database} --clean --if-exists --no-owner --no-privileges"

try {
    # Generate backup stream
    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = "docker"
    $ProcessInfo.Arguments = "exec ${ContainerName} pg_dump -U ${User} -d ${Database} --clean --if-exists --no-owner --no-privileges"
    $ProcessInfo.RedirectStandardOutput = $true
    $ProcessInfo.UseShellExecute = $false
    
    $Process = [System.Diagnostics.Process]::Start($ProcessInfo)
    $OutputFileStream = [System.IO.File]::Create($BackupFile)
    $GzipStream = New-Object System.IO.Compression.GZipStream($OutputFileStream, [System.IO.Compression.CompressionMode]::Compress)
    
    $Process.StandardOutput.BaseStream.CopyTo($GzipStream)
    $GzipStream.Close()
    $OutputFileStream.Close()
    $Process.WaitForExit()

    if ($Process.ExitCode -ne 0) {
        throw "pg_dump failed with exit code $($Process.ExitCode)"
    }

    # Verify backup size
    $FileSize = (Get-Item $BackupFile).Length
    if ($FileSize -lt 1024) {
        throw "Backup file size (${FileSize} bytes) is suspiciously small. Possible dump failure."
    }

    # Generate cryptographic SHA-256 checksum
    $Hash = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash
    Set-Content -Path $ChecksumFile -Value "${Hash}  $(Split-Path $BackupFile -Leaf)"

    Write-Host "[Learnova Backup] SUCCESS: Created ${BackupFile} (${FileSize} bytes)" -ForegroundColor Green
    Write-Host "[Learnova Backup] SHA256: ${Hash}" -ForegroundColor Green

    # Enforce retention policy: delete backups older than $RetentionDays
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupFolder -Filter "learnova_backup_*.sql.gz*" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | ForEach-Object {
        Write-Host "[Learnova Backup] Pruning expired backup: $($_.Name)" -ForegroundColor Yellow
        Remove-Item $_.FullName -Force
    }

} catch {
    Write-Host "[Learnova Backup] ERROR: Backup failed: $_" -ForegroundColor Red
    exit 1
}
