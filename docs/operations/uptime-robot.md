# UptimeRobot Monitors — employed.xibodev.com

> Status: **PARTIAL** — frontend monitor live; API monitor still pending an
> operator-supplied Main API Key.

## Intended monitors

| Monitor name | URL | Type | Method | Interval |
|---|---|---|---|---|
| `employed-api-uat` | `https://api.employed.xibodev.com/health` | HTTP | HEAD (UptimeRobot default) | 5 min |
| `employed-frontend-uat` | `https://employed.xibodev.com/` | HTTP | HEAD | 5 min |

> The API is now safe behind `HEAD` after the DEC-0002 fix (`/health` accepts
> both GET and HEAD with the same status). Before that fix, HEAD returned 405
> and every monitor would have read "down".

## Active monitors

| Monitor name | Monitor ID | URL | Status | Created |
|---|---|---|---|---|
| `employed.xibodev.com` (frontend) | `803170467` | `https://employed.xibodev.com` | UP (200) | 2026-05-27 |
| `employed-api-uat` (api) | _pending — see "Operator action required" below_ | `https://api.employed.xibodev.com/health` | — | — |

(Confirmed via `getMonitors` on 2026-05-28; account `mekjr1@gmail.com`, free tier 20/50 used.)

## Operator action required (one-time)

The current `UPTIMEROBOT_API_KEY` in `C:\Users\gafar\.xibodev\secrets\integrations\UPTIMEROBOT.env`
is a **monitor-specific / read-only key** (prefix `u3...`). It is sufficient for
`getAccountDetails` and `getMonitors`, but `newMonitor` returns **403 Forbidden**.

To unblock the API monitor:

1. Log in to the UptimeRobot dashboard (`mekjr1@gmail.com`).
2. Navigate to **My Settings -> API Settings** and copy the **Main API Key**
   (starts with `ur`, not `u3` or `m`).
3. Update the env file:
   ```
   UPTIMEROBOT_API_KEY=ur<main-key-here>
   ```
4. Run the helper script:
   ```bash
   bash backend/scripts/create-uptimerobot-monitors.sh
   ```
   This is idempotent -- it skips any monitor whose `url` matches an existing
   one. It will create only `employed-api-uat`.
5. The script prints the new monitor ID; record it in the **Active monitors**
   table above and commit the doc update.

## Why we are NOT switching to the dashboard manually

Recording monitor IDs in this file is what the deployment / on-call runbook
keys off -- the IDs need to live in the repo. The helper script is the
contract that keeps source-of-truth and reality in sync.

## See also

- `_integrations/BOXES.md` -- `UPTIMEROBOT_API_KEY` is a shared GH secret in `mekjr1/.github`
- `_integrations/_brain_data/decisions/DEC-0002.md` -- the HEAD/405 bug
- `backend/app/main.py` -- `/health` accepts `GET` and `HEAD`
- `backend/tests/test_observability.py::test_health_accepts_head_for_uptimerobot` -- regression
- `docs/operations/oncall.md` -- alert routing