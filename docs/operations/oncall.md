# On-Call & Alert Routing

> consolidated-011 / MON-01 / RD-04 — alert routing documentation.

## Alert Routing

### Current Stack

| Layer | Tool | Owner |
|-------|------|-------|
| Error tracking | Sentry (`SENTRY_DSN` env var) | Dev team |
| Uptime monitoring | UptimeRobot -> `/healthz?db=1` | Ops |
| Application metrics | `/metrics` endpoint (JSON) | Ops |
| Backup monitoring | Cron exit-code check | Ops |

### Sentry Alert Rules (recommended)

Configure these in the Sentry dashboard for the `employed` project:

1. **New issue spike** — alert when >5 new events in 10 minutes
2. **High error rate** — alert when error rate >1% of transactions
3. **Unhandled exception** — immediate alert for any `captureException`

### Escalation Path

| Severity | Response time | Channel | Action |
|----------|--------------|---------|--------|
| P1 (site down) | 15 min | Phone/SMS | Page on-call engineer |
| P2 (degraded) | 1 hour | Slack/Email | Investigate, post update |
| P3 (non-critical) | Next business day | Email | Triage in standup |

### Integration Options

When the team is ready to add PagerDuty or OpsGenie:

1. Create a service in PagerDuty/OpsGenie for `employed-production`
2. Set up a Sentry integration -> route P1/P2 alerts to the service
3. Configure UptimeRobot webhook -> same PagerDuty/OpsGenie service
4. Add the integration key to the deployment environment (not in code)

### On-Call Rotation

| Role | Schedule | Contact |
|------|----------|---------|
| Primary on-call | TBD — assign via PagerDuty/OpsGenie | @mekjr1 (placeholder) |
| Secondary/escalation | TBD | TBD |

> **Action required:** Assign on-call owners and configure real alert
> routing before production launch. This document is a placeholder
> for the release gate requirement.
