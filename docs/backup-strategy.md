# Backup Strategy & Disaster Recovery

> employed.co.mz — MongoDB + Meteor

## 1. Data Classification

| Store | RPO | RTO | Notes |
|-------|-----|-----|-------|
| MongoDB (jobs, users, paymentIntents, jobReports) | 1 hour | 4 hours | Primary business data |
| Stripe event log | N/A | N/A | Stripe retains this; webhook replay available |
| UploadCare CDN assets | N/A | N/A | Hosted externally; no backup needed |
| `.meteor/local` | N/A | Rebuild | Ephemeral build cache |

## 2. Backup Schedule

### MongoDB — `mongodump`

```bash
# Runs via cron on the host (or a sidecar container)
# Every 6 hours — matches RPO target of 1 hour with margin
0 */6 * * * /usr/bin/mongodump \
  --uri="$MONGO_URL" \
  --gzip \
  --archive=/backups/employed-$(date +\%Y\%m\%d-\%H\%M).gz \
  2>> /var/log/backup.log
```

### Retention

| Window | Frequency | Copies |
|--------|-----------|--------|
| Last 48 hours | Every 6 hours | 8 |
| Last 30 days | Daily (midnight) | 30 |
| Last 12 months | Monthly (1st) | 12 |

Old backups are pruned by a `find /backups -mtime +N -delete` cron.

### Off-site Copy

Upload the daily backup to a remote location (S3, B2, rsync to a second server):

```bash
# Example: rclone to Backblaze B2
rclone copy /backups/employed-*.gz b2:employed-backups/daily/ --max-age 24h
```

## 3. Restore Procedure

### Full Restore

```bash
# Stop the app container first
docker compose stop app

# Restore from the latest backup
mongorestore --uri="$MONGO_URL" \
  --gzip --archive=/backups/employed-YYYYMMDD-HHMM.gz \
  --drop

# Restart the app
docker compose start app
```

### Point-in-Time (oplog)

If the replica set has oplog enabled (recommended for production):

```bash
mongorestore --uri="$MONGO_URL" \
  --gzip --archive=/backups/employed-YYYYMMDD-HHMM.gz \
  --oplogReplay \
  --oplogLimit="$(date -d '2 hours ago' +%s):0"
```

## 4. Verification

- **Weekly**: automated `mongorestore --dryRun` against a throwaway container
- **Monthly**: manual restore to a staging instance, verify job count + user count match

```bash
# Quick sanity check after restore
mongosh "$MONGO_URL" --eval '
  print("jobs:", db.jobs.countDocuments());
  print("users:", db.users.countDocuments());
  print("paymentIntents:", db.paymentIntents.countDocuments());
'
```

## 5. Disaster Recovery Runbook

| Scenario | Action | Owner |
|----------|--------|-------|
| Database corruption | Restore from latest 6h backup | Ops |
| Server loss | Re-deploy from Docker image + restore DB | Ops |
| Region outage | Spin up on fallback VPS + point DNS + restore from off-site backup | Ops |
| Accidental data deletion | Restore specific collection from backup | Ops + Dev |

### Recovery Steps

1. Identify scope of damage (which collections? how recent?)
2. Find the most recent clean backup (`ls -lt /backups/`)
3. Stop the application (`docker compose stop app`)
4. Restore (`mongorestore` with appropriate flags)
5. Verify data integrity (counts, spot-check recent jobs)
6. Restart application (`docker compose up -d`)
7. Check `/healthz` endpoint responds 200
8. Monitor Sentry for error spikes for 1 hour

## 6. Monitoring

- Backup cron failures → alert via UptimeRobot heartbeat or cron monitoring service
- Disk space on backup volume → alert at 80% capacity
- Off-site sync failures → alert via rclone exit code check
