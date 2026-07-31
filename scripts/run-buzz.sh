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

start_deps() {
  log "Postgres"
  sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || log "  already running"
  log "Redis"
  redis-cli ping >/dev/null 2>&1 || sudo redis-server /etc/redis/redis.conf --daemonize yes
  redis-cli ping >/dev/null 2>&1 || die "Redis failed to start"
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
    BUZZ_AUTO_MIGRATE="${BUZZ_AUTO_MIGRATE:-true}" \
    BUZZ_WEB_DIR="${BUZZ_WEB_DIR:-./web/dist}" \
      nohup ./target/release/buzz-relay > "$RELAY_LOG" 2>&1 &
    echo $! > "$RELAY_PID"
    log "Relay pid $(cat "$RELAY_PID"), logging to $RELAY_LOG"
    log "Waiting for health..."
    for _ in $(seq 1 30); do
      if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
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
      warn "No pid file; nothing to stop"
    fi
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
