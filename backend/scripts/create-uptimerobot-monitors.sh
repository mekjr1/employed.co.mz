#!/usr/bin/env bash
# backend/scripts/create-uptimerobot-monitors.sh
#
# Idempotent helper that creates the *missing* UptimeRobot monitors for
# Employed. Run this ONCE after updating UPTIMEROBOT_API_KEY to a Main API
# Key (prefix `ur`). Existing monitors are detected by URL and skipped.
#
# Required env (sourced from C:\Users\gafar\.xibodev\secrets\integrations\UPTIMEROBOT.env
# on the operator machine, or supplied directly):
#   UPTIMEROBOT_API_KEY  - Main API Key (starts with `ur`)
#
# Optional env:
#   API_HEALTH_URL       - default https://api.employed.xibodev.com/health
#   FRONTEND_URL         - default https://employed.xibodev.com/
#   INTERVAL_SECONDS     - default 300 (5 min, free-tier minimum)
#
# Exit codes:
#   0  - every intended monitor exists (created or already there)
#   1  - missing UPTIMEROBOT_API_KEY
#   2  - getMonitors call failed
#   3  - newMonitor call failed (most often a 403 -> the key is read-only)

set -euo pipefail

: "${UPTIMEROBOT_API_KEY:?UPTIMEROBOT_API_KEY must be set (Main API Key, prefix 'ur')}"

API_HEALTH_URL="${API_HEALTH_URL:-https://api.employed.xibodev.com/health}"
FRONTEND_URL="${FRONTEND_URL:-https://employed.xibodev.com/}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-300}"

API="https://api.uptimerobot.com/v2"
JQ="$(command -v jq || true)"
if [[ -z "${JQ}" ]]; then
  echo "[uptimerobot] ERROR: jq is required (apt-get install jq / brew install jq)" >&2
  exit 2
fi

echo "[uptimerobot] fetching existing monitors..."
existing="$(curl -fsS -X POST "${API}/getMonitors" \
  -d "api_key=${UPTIMEROBOT_API_KEY}&format=json" || true)"

if [[ -z "${existing}" ]] || [[ "$(echo "${existing}" | jq -r '.stat')" != "ok" ]]; then
  echo "[uptimerobot] ERROR: getMonitors failed: ${existing}" >&2
  exit 2
fi

create_if_missing() {
  local friendly_name="$1"
  local url="$2"
  local existing_id
  existing_id="$(echo "${existing}" | jq -r --arg url "${url}" \
    '.monitors[]? | select(.url == $url) | .id' | head -n1)"
  if [[ -n "${existing_id}" ]]; then
    echo "[uptimerobot] EXISTS ${friendly_name} (id=${existing_id}, url=${url}) -- skipping"
    return 0
  fi

  echo "[uptimerobot] CREATING ${friendly_name} -> ${url}"
  # type=1 -> HTTP(s). interval is in seconds. http_method=1 -> HEAD.
  local resp
  resp="$(curl -sS -X POST "${API}/newMonitor" \
    -d "api_key=${UPTIMEROBOT_API_KEY}&format=json" \
    --data-urlencode "friendly_name=${friendly_name}" \
    --data-urlencode "url=${url}" \
    -d "type=1" \
    -d "interval=${INTERVAL_SECONDS}" \
    -d "http_method=1")"

  local stat
  stat="$(echo "${resp}" | jq -r '.stat')"
  if [[ "${stat}" != "ok" ]]; then
    echo "[uptimerobot] ERROR: newMonitor failed: ${resp}" >&2
    return 1
  fi
  local new_id
  new_id="$(echo "${resp}" | jq -r '.monitor.id')"
  echo "[uptimerobot] CREATED ${friendly_name} -> id=${new_id} (record this in docs/operations/uptime-robot.md)"
}

failures=0
create_if_missing "employed-api-uat" "${API_HEALTH_URL}" || failures=$((failures+1))
create_if_missing "employed-frontend-uat" "${FRONTEND_URL}" || failures=$((failures+1))

if (( failures > 0 )); then
  echo "[uptimerobot] ${failures} monitor(s) failed; see errors above" >&2
  exit 3
fi

echo "[uptimerobot] done"
