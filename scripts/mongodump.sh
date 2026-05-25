#!/usr/bin/env bash
# consolidated-004 / DB-01 — automated mongodump backup script.
#
# Usage:
#   MONGO_URL="mongodb://user:pass@host:27017/employed" ./scripts/mongodump.sh
#
# Intended to run via cron or a sidecar container. Creates a gzipped
# archive in $BACKUP_DIR (default: /backups) and prunes backups older
# than $RETENTION_DAYS (default: 30).
#
# See docs/backup-strategy.md for the full RPO/RTO schedule.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${BACKUP_DIR}/employed-${TIMESTAMP}.gz"

mkdir -p "${BACKUP_DIR}"

echo "[mongodump] Starting backup -> ${ARCHIVE}"
mongodump \
  --uri="${MONGO_URL}" \
  --gzip \
  --archive="${ARCHIVE}"

echo "[mongodump] Backup complete: $(du -h "${ARCHIVE}" | cut -f1)"

# Prune old backups
PRUNED=$(find "${BACKUP_DIR}" -name "employed-*.gz" -mtime +"${RETENTION_DAYS}" -delete -print | wc -l)
echo "[mongodump] Pruned ${PRUNED} backups older than ${RETENTION_DAYS} days."
