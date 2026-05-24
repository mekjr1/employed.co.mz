#!/usr/bin/env sh
set -eu

if [ "$#" -lt 3 ]; then
  echo "Usage: wait-for-it.sh host:port -- command [args...]" >&2
  exit 1
fi

TARGET="$1"
shift

if [ "$1" != "--" ]; then
  echo "Usage: wait-for-it.sh host:port -- command [args...]" >&2
  exit 1
fi
shift

HOST="${TARGET%%:*}"
PORT="${TARGET##*:}"
TIMEOUT="${WAIT_FOR_IT_TIMEOUT:-60}"
SLEEP_SECONDS="${WAIT_FOR_IT_INTERVAL:-2}"
ELAPSED=0

while ! python - "$HOST" "$PORT" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])
client = socket.socket()
client.settimeout(1)
try:
    client.connect((host, port))
except OSError:
    sys.exit(1)
finally:
    client.close()
PY
do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "Timed out waiting for ${HOST}:${PORT}" >&2
    exit 1
  fi
  echo "Waiting for ${HOST}:${PORT}..."
  sleep "$SLEEP_SECONDS"
  ELAPSED=$((ELAPSED + SLEEP_SECONDS))
done

exec "$@"
