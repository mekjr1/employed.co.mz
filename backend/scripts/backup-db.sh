#!/usr/bin/env bash
# backend/scripts/backup-db.sh — P-013 / P-NEW-008 reference implementation.
#
# Daily PostgreSQL backup: pg_dump → gzip → local /backups → optional S3 push.
# Designed for the cron entry in docs/operations/postgres-backup.md:
#
#   0 2 * * * root /opt/employed/scripts/backup-db.sh \
#       >> /var/log/employed-backup.log 2>&1
#
# Required env (typically supplied by /opt/employed/.env):
#   POSTGRES_USER       — DB role with read on every schema/table
#   POSTGRES_DB         — database name (e.g. employed)
# Optional env:
#   POSTGRES_CONTAINER  — docker container name running postgres
#                         (default: discovered with `docker ps -qf name=postgres`)
#   BACKUP_DIR          — local dump directory (default: /backups)
#   BACKUP_RETENTION_DAYS — auto-prune older dumps (default: 14)
#   BACKUP_BUCKET       — when set, also uploads to s3://$BACKUP_BUCKET/postgres/
#   AWS_DEFAULT_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY — S3 creds
#
# Exit codes:
#   0  — backup written (and uploaded if BACKUP_BUCKET set)
#   1  — required env missing
#   2  — pg_dump failed
#   3  — gzip failed
#   4  — s3 upload failed (local copy still kept)

set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="${BACKUP_DIR}/employed_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Discover the running postgres container if not pinned explicitly.
if [[ -z "${POSTGRES_CONTAINER:-}" ]]; then
  POSTGRES_CONTAINER="$(docker ps --format '{{.Names}}' | grep -m1 postgres || true)"
fi

if [[ -z "${POSTGRES_CONTAINER}" ]]; then
  echo "[backup-db] ERROR: no postgres container found; set POSTGRES_CONTAINER explicitly" >&2
  exit 1
fi

echo "[backup-db] container=${POSTGRES_CONTAINER} db=${POSTGRES_DB} dest=${DEST}"

# pg_dump → gzip → file. Use --no-owner so a restore can target any role.
if ! docker exec "${POSTGRES_CONTAINER}" \
      pg_dump --no-owner --no-acl -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
    | gzip -9 > "${DEST}.tmp"; then
  echo "[backup-db] ERROR: pg_dump | gzip failed" >&2
  rm -f "${DEST}.tmp"
  exit 2
fi
mv "${DEST}.tmp" "${DEST}"
echo "[backup-db] wrote $(stat -c%s "${DEST}" 2>/dev/null || wc -c < "${DEST}") bytes to ${DEST}"

# Optional S3 / S3-compatible upload (idempotent — re-running is safe).
if [[ -n "${BACKUP_BUCKET:-}" ]]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "[backup-db] WARN: BACKUP_BUCKET set but aws CLI not installed; skipping upload" >&2
  else
    if ! aws s3 cp "${DEST}" "s3://${BACKUP_BUCKET}/postgres/$(basename "${DEST}")" --sse AES256; then
      echo "[backup-db] ERROR: s3 upload failed; local copy retained at ${DEST}" >&2
      exit 4
    fi
    echo "[backup-db] uploaded to s3://${BACKUP_BUCKET}/postgres/$(basename "${DEST}")"
  fi
fi

# Prune local dumps older than the retention window.
if [[ "${BACKUP_RETENTION_DAYS}" -gt 0 ]]; then
  find "${BACKUP_DIR}" -maxdepth 1 -name 'employed_*.sql.gz' \
    -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete | \
    sed 's/^/[backup-db] pruned /'
fi

echo "[backup-db] success ${TIMESTAMP}"
