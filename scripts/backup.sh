#!/usr/bin/env bash
# DB-01 — local mongodump backup helper.
#
# Uses MONGO_URL from the environment when provided, otherwise falls back to
# the local development database. Creates one timestamped dump directory per run
# and prunes backup directories older than 7 days.

set -euo pipefail

MONGO_URL="${MONGO_URL:-mongodb://localhost:27017/employed}"
BACKUP_ROOT="${BACKUP_ROOT:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST_DIR="${BACKUP_ROOT}/${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

mkdir -p "${DEST_DIR}"

echo "[backup] dumping ${MONGO_URL} -> ${DEST_DIR}"
mongodump --uri="${MONGO_URL}" --out="${DEST_DIR}"

echo "[backup] removing backups older than ${RETENTION_DAYS} days from ${BACKUP_ROOT}"
find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime +"${RETENTION_DAYS}" -exec rm -rf {} +

echo "[backup] complete"
