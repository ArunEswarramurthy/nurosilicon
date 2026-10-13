#!/bin/bash
# ============================================================================
# CRACKFLOW - Automated Database Backup Script
# Runs daily via cron, retains backups for 30 days
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/crackflow_${DATE}.sql.gz"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting database backup..."

# Create backup directory if not exists
mkdir -p "${BACKUP_DIR}"

# Perform backup with compression
mysqldump \
    -h "${MYSQL_HOST}" \
    -u "${MYSQL_USER}" \
    -p"${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    "${MYSQL_DATABASE}" | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log "Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    log "ERROR: Backup failed or file is empty"
    exit 1
fi

# Upload to S3 if configured
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
    log "Uploading to S3..."
    aws s3 cp "${BACKUP_FILE}" "s3://${BACKUP_S3_BUCKET}/backups/$(basename ${BACKUP_FILE})"
    log "S3 upload completed"
fi

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "crackflow_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

# List remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "crackflow_*.sql.gz" -type f 2>/dev/null | wc -l)
log "Backup complete. Total backups retained: ${BACKUP_COUNT}"
