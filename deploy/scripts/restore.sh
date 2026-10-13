#!/bin/bash
# ============================================================================
# CRACKFLOW - Database Restore Script
# Usage: ./restore.sh <backup_file.sql.gz>
# ============================================================================

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    echo "Available backups:"
    ls -la /backups/crackflow_*.sql.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Database: ${MYSQL_DATABASE}"
echo "Backup file: ${BACKUP_FILE}"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Restoring database..."
gunzip -c "${BACKUP_FILE}" | mysql \
    -h "${MYSQL_HOST}" \
    -u "${MYSQL_USER}" \
    -p"${MYSQL_PASSWORD}" \
    "${MYSQL_DATABASE}"

echo "Database restored successfully from ${BACKUP_FILE}"
