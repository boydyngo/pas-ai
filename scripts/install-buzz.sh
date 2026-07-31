#!/usr/bin/env bash
#
# install-buzz.sh — reproducible source install of Block Buzz for a restricted-egress host.
#
# Use this ONLY where container registries and binary CDNs are blocked. Where egress is
# open, use upstream instead:
#     git clone https://github.com/block/buzz.git && cd buzz
#     . ./bin/activate-hermit && just setup && just build && just dev
#
# See docs/buzz/CONSTRAINTS.md for why this script exists.
#
set -euo pipefail

BUZZ_SRC="${BUZZ_SRC:-/home/user/buzz-src}"
BUZZ_REPO="${BUZZ_REPO:-https://github.com/block/buzz.git}"
PG_VERSION="${PG_VERSION:-16}"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 0. Preflight
# ---------------------------------------------------------------------------
log "Preflight"
command -v cargo >/dev/null || die "cargo not found — install Rust 1.88+"
command -v git   >/dev/null || die "git not found"
command -v node  >/dev/null || die "node not found"

cargo_ver=$(cargo --version | awk '{print $2}')
log "cargo ${cargo_ver}, node $(node --version)"

# Buzz documents Node 24+. Node 22 builds the web bundle fine in practice; warn, don't block.
node_major=$(node --version | sed 's/^v\([0-9]*\).*/\1/')
[ "$node_major" -ge 24 ] || warn "Node ${node_major} < 24 (upstream target). Web build is known to work on 22."

# ---------------------------------------------------------------------------
# 1. Source
# ---------------------------------------------------------------------------
if [ -d "$BUZZ_SRC/.git" ]; then
  log "Source already present at $BUZZ_SRC"
else
  log "Cloning Buzz -> $BUZZ_SRC"
  git clone --depth 1 "$BUZZ_REPO" "$BUZZ_SRC"
fi
cd "$BUZZ_SRC"
[ -f .env ] || { cp .env.example .env; log "Created .env from .env.example"; }

# ---------------------------------------------------------------------------
# 2. Data tier — native packages instead of containers
# ---------------------------------------------------------------------------
# Upstream ships Postgres 17 via Docker. The PGDG apt repo is blocked here, so we use
# the distro's Postgres 16. All 26 migrations were audited for PG17-only syntax: none
# found; the only requirement is the pgcrypto extension, which 16 provides.
log "Installing Postgres ${PG_VERSION} and Redis"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -qq || warn "apt update reported errors (third-party PPAs may be blocked); continuing"
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  "postgresql-${PG_VERSION}" redis-server

log "Starting Postgres"
sudo pg_ctlcluster "${PG_VERSION}" main start 2>/dev/null || log "Postgres already running"

log "Starting Redis"
redis-cli ping >/dev/null 2>&1 || sudo redis-server /etc/redis/redis.conf --daemonize yes
redis-cli ping >/dev/null 2>&1 || die "Redis failed to start"

log "Provisioning database"
# Idempotent: tolerate an existing role/database.
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='buzz'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE buzz WITH LOGIN PASSWORD 'buzz_dev' SUPERUSER;"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='buzz'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE buzz OWNER buzz;"

PGPASSWORD=buzz_dev psql -h localhost -U buzz -d buzz -tAc "SELECT version();" >/dev/null \
  || die "Cannot connect to the buzz database"

# ---------------------------------------------------------------------------
# 3. Build the Rust binaries
# ---------------------------------------------------------------------------
# crates.io is in the proxy no_proxy list, so Cargo fetches work where image pulls do not.
log "Building buzz-relay, buzz-cli, buzz-admin, buzz-acp, buzz-agent (this takes a while)"
cargo build --release -p buzz-relay -p buzz-cli -p buzz-admin -p buzz-acp -p buzz-agent

# ---------------------------------------------------------------------------
# 4. Build the web client (this is the phone-accessible UI)
# ---------------------------------------------------------------------------
log "Building web client"
pnpm install --filter buzz-web... --ignore-scripts
( cd web && npx vite build )

# ---------------------------------------------------------------------------
# 5. Report
# ---------------------------------------------------------------------------
cat <<EOF

$(log "Install complete")

  Binaries : $BUZZ_SRC/target/release/{buzz-relay,buzz-cli,buzz-admin,buzz-acp,buzz-agent}
  Web UI   : $BUZZ_SRC/web/dist
  Postgres : localhost:5432  (db=buzz user=buzz)
  Redis    : localhost:6379

  Unavailable in this environment (see docs/buzz/CONSTRAINTS.md):
    - Full-text search  (Typesense binary undownloadable)
    - Media upload      (MinIO binary undownloadable)

  Next:
    scripts/run-buzz.sh start
    docs/buzz/PROVIDERS.md   — connect OpenAI / Anthropic / Google
    docs/buzz/MOBILE.md      — reach it from your phone
EOF
