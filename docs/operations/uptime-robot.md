# UptimeRobot Monitors — employed.xibodev.com

> Status: **BLOCKED — operator action required** (see note below)

## Intended monitors

| Monitor name | URL | Type | Interval |
|---|---|---|---|
| `employed-api-uat` | `https://api.employed.xibodev.com/health` | HTTP | 5 min |
| `employed-frontend-uat` | `https://employed.xibodev.com/` | HTTP | 5 min |

## Provisioning attempt (P-019)

The fix-executor attempted to create both monitors via the UptimeRobot v2 API
using the key stored in `C:\Users\gafar\.xibodev\secrets\integrations\UPTIMEROBOT.env`.

**Result:** Both calls returned `stat=fail, type=access_denied` — the stored API key
appears to be a **read-only** key (prefix `u…` rather than the write-capable `ur…`
main API key).  No monitors were created; no rollback was required.

## Operator action required

1. Log in to the UptimeRobot dashboard.
2. Navigate to **My Settings → API Settings** and copy the **Main API Key** (starts with `ur`).
3. Update `C:\Users\gafar\.xibodev\secrets\integrations\UPTIMEROBOT.env`:
   ```
   UPTIMEROBOT_API_KEY=ur<main-key-here>
   ```
4. Re-run the fix-executor for P-019, or create the monitors manually:
   - **employed-api-uat**: `https://api.employed.xibodev.com/health`, HTTP, 5-min
   - **employed-frontend-uat**: `https://employed.xibodev.com/`, HTTP, 5-min
5. Record the returned monitor IDs in this file under "Active monitors".

## Active monitors

| Monitor name | Monitor ID | Created |
|---|---|---|
| `employed-api-uat` | _pending — see operator action_ | — |
| `employed-frontend-uat` | _pending — see operator action_ | — |