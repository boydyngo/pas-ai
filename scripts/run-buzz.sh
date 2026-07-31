#!/usr/bin/env bash
#
# run-buzz.sh — start / stop / status for the source-built Buzz stack.
#
#   ./scripts/run-buzz.sh start|stop|status|logs|migrate|key
#
set -euo pipefail

BUZZ_SRC="${BUZZ_SRC:-/home/user/buzz-src}"
PG_VERSION="${PG_VERSION:-16}"
RELAY_LOG="${RELAY_LOG:-$BUZZ_SRC/relay.log}"
RELAY_PID="${RELAY_PID:-$BUZZ_SRC/relay.pid}"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[ -d "$BUZZ_SRC" ] || die "$BUZZ_SRC not found — run scripts/install-buzz.sh first"
cd "$BUZZ_SRC"

S3_ENDPOINT="${S3_ENDPOINT:-http://127.0.0.1:9000}"
S3_BUCKET="${S3_BUCKET:-buzz-media}"
MOTO_LOG="${MOTO_LOG:-$BUZZ_SRC/moto.log}"

start_deps() {
  log "Postgres"
  sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || log "  already running"

  log "Redis"
  redis-cli ping >/dev/null 2>&1 || sudo redis-server /etc/redis/redis.conf --daemonize yes
  redis-cli ping >/dev/null 2>&1 || die "Redis failed to start"

  # Object storage. The relay's A3 conformance probe is a FATAL startup gate, so
  # this is not optional — without an S3 endpoint the relay aborts at boot.
  log "Object storage (moto)"
  if ! curl -sf --noproxy '*' -o /dev/null "$S3_ENDPOINT" 2>/dev/null; then
    command -v moto_server >/dev/null \
      || die "moto_server not found — run scripts/install-buzz.sh, or set BUZZ_GIT_CONFORMANCE_PROBE=false to boot without object storage"
    nohup moto_server -H 127.0.0.1 -p 9000 > "$MOTO_LOG" 2>&1 &
    for _ in $(seq 1 20); do
      curl -sf --noproxy '*' -o /dev/null "$S3_ENDPOINT" 2>/dev/null && break
      sleep 1
    done
    curl -sf --noproxy '*' -o /dev/null "$S3_ENDPOINT" 2>/dev/null \
      || die "moto failed to start — see $MOTO_LOG"
  else
    log "  already running"
  fi

  # moto is in-memory: the bucket vanishes with the process, so recreate every time.
  AWS_ACCESS_KEY_ID="${BUZZ_S3_ACCESS_KEY:-buzz_dev}" \
  AWS_SECRET_ACCESS_KEY="${BUZZ_S3_SECRET_KEY:-buzz_dev_secret}" \
  AWS_DEFAULT_REGION="${BUZZ_S3_REGION:-us-east-1}" \
  python3 - "$S3_ENDPOINT" "$S3_BUCKET" <<'PY' || die "Could not ensure the S3 bucket"
import sys, boto3, botocore
endpoint, bucket = sys.argv[1], sys.argv[2]
s3 = boto3.client("s3", endpoint_url=endpoint)
try:
    s3.head_bucket(Bucket=bucket)
except botocore.exceptions.ClientError:
    s3.create_bucket(Bucket=bucket)
PY
}

case "${1:-status}" in

  start)
    start_deps
    [ -x ./target/release/buzz-relay ] || die "buzz-relay not built — run scripts/install-buzz.sh"

    if [ -f "$RELAY_PID" ] && kill -0 "$(cat "$RELAY_PID")" 2>/dev/null; then
      die "Relay already running (pid $(cat "$RELAY_PID"))"
    fi

    log "Starting relay"
    set -a; . ./.env; set +a
    # BUZZ_AUTO_MIGRATE lets the relay apply pending migrations on boot.
    # BUZZ_WEB_DIR points at the built bundle; BUZZ_SERVE_GIT_WEB_GUI (default false)
    # is what actually lets `/` return index.html to a browser instead of the NIP-11 doc.
    BUZZ_AUTO_MIGRATE="${BUZZ_AUTO_MIGRATE:-true}" \
    BUZZ_WEB_DIR="${BUZZ_WEB_DIR:-./web/dist}" \
    BUZZ_SERVE_GIT_WEB_GUI="${BUZZ_SERVE_GIT_WEB_GUI:-true}" \
      nohup ./target/release/buzz-relay > "$RELAY_LOG" 2>&1 &
    echo $! > "$RELAY_PID"
    relay_pid=$(cat "$RELAY_PID")
    log "Relay pid $relay_pid, logging to $RELAY_LOG"
    log "Waiting for health..."
    for _ in $(seq 1 40); do
      # Check liveness of OUR pid first: a draining predecessor can answer /health
      # long enough to look like success while this process has already panicked.
      if ! kill -0 "$relay_pid" 2>/dev/null; then
        warn "Relay pid $relay_pid exited during startup"
        tail -30 "$RELAY_LOG" >&2
        rm -f "$RELAY_PID"; exit 1
      fi
      if curl -sf --noproxy '*' http://localhost:3000/health >/dev/null 2>&1; then
        log "Relay healthy at http://localhost:3000"; exit 0
      fi
      sleep 1
    done
    warn "Relay did not report healthy within 30s — check: $RELAY_LOG"
    tail -20 "$RELAY_LOG" >&2
    exit 1
    ;;

  stop)
    if [ -f "$RELAY_PID" ]; then
      pid=$(cat "$RELAY_PID")
      log "Stopping relay (pid $pid)"
      kill "$pid" 2>/dev/null || warn "pid $pid not running"
      rm -f "$RELAY_PID"
    else
      warn "No pid file; looking for a stray relay"
      pkill -f 'target/release/buzz-relay' 2>/dev/null || true
    fi
    # The relay does a 30s graceful drain and holds its metrics (9102) and health
    # (8080) listeners until it exits. Starting a new one before those release
    # panics it with "Address already in use", so wait for a genuinely free port.
    log "Waiting for ports to release"
    for _ in $(seq 1 40); do
      pgrep -f 'target/release/buzz-relay' >/dev/null 2>&1 || break
      sleep 1
    done
    if pgrep -f 'target/release/buzz-relay' >/dev/null 2>&1; then
      warn "Relay still draining after 40s; sending SIGKILL"
      pkill -9 -f 'target/release/buzz-relay' 2>/dev/null || true
      sleep 2
    fi
    log "Stopped"
    # Postgres and Redis are deliberately left running — other things may use them.
    ;;

  status)
    printf 'Postgres : '; pg_isready -h localhost -q && echo up || echo DOWN
    printf 'Redis    : '; redis-cli ping 2>/dev/null || echo DOWN
    printf 'Relay    : '
    if [ -f "$RELAY_PID" ] && kill -0 "$(cat "$RELAY_PID")" 2>/dev/null; then
      echo "up (pid $(cat "$RELAY_PID"))"
    else
      echo DOWN
    fi
    printf 'Health   : '; curl -sf http://localhost:3000/health 2>/dev/null || echo unreachable
    echo
    ;;

  logs)    tail -f "$RELAY_LOG" ;;

  migrate)
    start_deps
    log "Applying migrations"
    BUZZ_AUTO_MIGRATE=true ./target/release/buzz-relay --migrate-only 2>/dev/null \
      || warn "No --migrate-only flag; the relay auto-migrates on boot with BUZZ_AUTO_MIGRATE=true"
    ;;

  key)
    # Mint a Nostr identity for an agent. SAVE THE SECRET — it is not recoverable.
    ./target/release/buzz-admin generate-key
    ;;

  *) die "usage: $0 start|stop|status|logs|migrate|key" ;;
esac
