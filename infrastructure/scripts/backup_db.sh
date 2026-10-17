#!/usr/bin/env bash
# =============================================================================
# Learnova AI - Automated Database Backup Script (POSIX Bash)
# Phase 10A: Deployment Readiness & Disaster Recovery
# =============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-infrastructure/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
CONTAINER_NAME="${CONTAINER_NAME:-learnova-postgres}"
DATABASE="${DATABASE:-learnova_db}"
USER="${POSTGRES_USER:-postgres}"

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_PATH="${ROOT_DIR}/${BACKUP_DIR}"

mkdir -p "${BACKUP_PATH}"

BACKUP_FILE="${BACKUP_PATH}/learnova_backup_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

echo "[Learnova Backup] Starting backup of ${DATABASE} from ${CONTAINER_NAME}..."

# Run pg_dump, pipe through gzip to destination
docker exec "${CONTAINER_NAME}" pg_dump -U "${USER}" -d "${DATABASE}" \
  --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"

# Verify file size
FILE_SIZE=$(wc -c < "${BACKUP_FILE}")
if [ "${FILE_SIZE}" -lt 1024 ]; then
  echo "[Learnova Backup] ERROR: Backup size ${FILE_SIZE} bytes is suspiciously small." >&2
  exit 1
fi

# Generate SHA-256 Checksum
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
fi

echo "[Learnova Backup] SUCCESS: Created ${BACKUP_FILE} (${FILE_SIZE} bytes)"
if [ -f "${CHECKSUM_FILE}" ]; then
  cat "${CHECKSUM_FILE}"
fi

# Prune backups older than retention window
find "${BACKUP_PATH}" -type f -name "learnova_backup_*.sql.gz*" -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
echo "[Learnova Backup] Pruned archives older than ${RETENTION_DAYS} days."
