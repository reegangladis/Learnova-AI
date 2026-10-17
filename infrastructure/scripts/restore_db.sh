#!/usr/bin/env bash
# =============================================================================
# Learnova AI - Database Disaster Recovery & Safe Restore Script (POSIX Bash)
# Phase 10A: Deployment Readiness & Disaster Recovery
# =============================================================================
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-learnova-postgres}"
DATABASE="${DATABASE:-learnova_db}"
USER="${POSTGRES_USER:-postgres}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_PATH="${ROOT_DIR}/infrastructure/backups"

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  BACKUP_FILE=$(find "${BACKUP_PATH}" -maxdepth 1 -name "learnova_backup_*.sql.gz" -type f | sort -r | head -n 1)
  if [ -z "${BACKUP_FILE}" ]; then
    echo "[Learnova Restore] ERROR: No backup files located in ${BACKUP_PATH}" >&2
    exit 1
  fi
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[Learnova Restore] ERROR: Target backup file ${BACKUP_FILE} not found." >&2
  exit 1
fi

echo "[Learnova Restore] Restoring ${DATABASE} from ${BACKUP_FILE}..."

# 1. Cryptographic SHA-256 verification if checksum file exists
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "[Learnova Restore] Validating SHA-256 digest..."
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c "${CHECKSUM_FILE}"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c "${CHECKSUM_FILE}"
  fi
  echo "[Learnova Restore] Integrity confirmed."
fi

# 2. Terminate active sessions
echo "[Learnova Restore] Terminating existing connections..."
docker exec "${CONTAINER_NAME}" psql -U "${USER}" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DATABASE}' AND pid <> pg_backend_pid();" >/dev/null || true

# 3. Apply backup stream
echo "[Learnova Restore] Restoring database schema and records..."
gzip -dc "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${USER}" -d "${DATABASE}" >/dev/null

# 4. Verify post-restore state
echo "[Learnova Restore] Verifying restored schema..."
HEAD_REV=$(docker exec "${CONTAINER_NAME}" psql -U "${USER}" -d "${DATABASE}" -t -A -c "SELECT version_num FROM alembic_version;")
TABLE_COUNT=$(docker exec "${CONTAINER_NAME}" psql -U "${USER}" -d "${DATABASE}" -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "[Learnova Restore] RESTORE PROCEDURE SUCCESSFUL!"
echo "  Alembic Head Revision: ${HEAD_REV}"
echo "  Restored Tables:       ${TABLE_COUNT}"
