# Learnova AI — Database Backup, Disaster Recovery & Safe Restore Procedure

## 1. Overview & Objectives
This document establishes the enterprise backup and disaster recovery (DR) protocols for the Learnova AI PostgreSQL database. It satisfies Phase 10A deployment readiness requirements for staging and production environments.

- **Recovery Point Objective (RPO):** < 24 hours (daily automated backups) / < 1 hour in staging with point-in-time recovery (PITR) enabled.
- **Recovery Time Objective (RTO):** < 15 minutes to full operational state.
- **Integrity Validation:** Cryptographic SHA-256 checksum generated concurrently with every backup artifact and strictly verified prior to restore execution.

---

## 2. Backup Architecture & Automation

### 2.1 Backup Format & Compression
- **Tool:** `pg_dump`
- **Flags:** `--clean --if-exists --no-owner --no-privileges`
- **Compression:** Streamed directly through `gzip -9` to minimize I/O footprint.
- **Storage Target:**
  - Local/Staging Volume: `infrastructure/backups/`
  - Cloud Production: Private S3 / GCS object storage bucket with object-locking (WORM) and AES-256 server-side encryption.

### 2.2 Execution Scripts
- **PowerShell (Windows / Host Automation):** [backup_db.ps1](file:///infrastructure/scripts/backup_db.ps1)
- **POSIX Bash (Linux / Container Environments):** [backup_db.sh](file:///infrastructure/scripts/backup_db.sh)

### 2.3 Automated Scheduling (Cron / Windows Task Scheduler)
- **POSIX Cron Schedule (Daily at 02:00 UTC):**
  ```cron
  0 2 * * * /path/to/Learnova-AI/infrastructure/scripts/backup_db.sh >> /var/log/learnova_backup.log 2>&1
  ```
- **Retention Policy:**
  - Rolling 7-day retention for daily backups.
  - Backups older than 7 days are automatically pruned by the script.

---

## 3. Disaster Recovery & Safe Restore Playbook

### Step 1: Pre-Restoration Assessment
1. Identify the incident severity and verify if application writes must be halted.
2. Put the frontend into maintenance mode or divert traffic at the load balancer.
3. Locate the target backup file in `infrastructure/backups/` (e.g. `learnova_backup_20261017_154735.sql.gz`).

### Step 2: Integrity Verification
Prior to executing any database operation, verify the SHA-256 checksum:
```powershell
Get-FileHash -Path infrastructure\backups\learnova_backup_20261017_154735.sql.gz -Algorithm SHA256
Get-Content infrastructure\backups\learnova_backup_20261017_154735.sql.gz.sha256
```

### Step 3: Connection Termination & Data Restoration
Execute the disaster recovery script:
- **Windows / Local:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File infrastructure\scripts\restore_db.ps1
  ```
- **Linux / Staging Container:**
  ```bash
  bash infrastructure/scripts/restore_db.sh [backup_file_path]
  ```

### Step 4: Post-Restoration Quality Gates
1. Verify Alembic schema migration head:
   ```bash
   alembic current
   # Expected output: 005_phase7_ai_tutor_rag (head)
   ```
2. Verify total table count (28 tables expected):
   ```sql
   SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
   ```
3. Run backend health check:
   ```bash
   curl -s http://localhost:8000/api/v1/health/all
   ```

---

## 4. Live Evidence & Verification Log
- **Live Backup Generated:** `learnova_backup_20261017_154735.sql.gz` (6,550 bytes)
- **Cryptographic Digest:** `6FD12BF0E7C92798AF8837A75F506A3353BE87F53253B544EC9D17F06A93EE47`
- **Restore Verification:** Successfully executed against `learnova-postgres` container. Reconciled 28 tables and confirmed Alembic revision `005_phase7_ai_tutor_rag`.
