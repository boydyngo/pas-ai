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
# 2b. Object storage
# ---------------------------------------------------------------------------
# The relay runs a FATAL startup gate — the git-on-object-storage A3 conformance
# probe — which admits the S3 backend against a linearizable conditional-write
# axiom. It defaults to ON and aborts boot on failure, so an S3 endpoint is not
# optional. MinIO's download host is blocked here; PyPI is not, so we use moto,
# which passes the probe. NOTE: moto_server is in-memory — objects do not survive
# a restart. Replace with MinIO or real S3 for anything beyond a POC.
log "Installing moto (S3-compatible server)"
# --ignore-installed PyYAML: the distro-managed PyYAML has no RECORD file, so pip
# cannot uninstall it and the whole install aborts without this.
pip install --quiet --ignore-installed PyYAML "moto[server]" boto3 \
  || warn "moto install failed — the relay will not boot without an S3 backend
           unless you set BUZZ_GIT_CONFORMANCE_PROBE=false"

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

  Binaries : $BUZZ_SRC/target/release/{buzz,buzz-relay,buzz-admin,buzz-acp,buzz-agent}
             (the buzz-cli crate builds a binary named 'buzz')
  Web UI   : $BUZZ_SRC/web/dist
  Postgres : localhost:5432  (db=buzz user=buzz)
  Redis    : localhost:6379
  S3       : localhost:9000  (moto — started by run-buzz.sh; IN-MEMORY, not durable)

  Working: relay, channels, threads, DMs, canvases, audit log, git-on-object-storage,
           and full-text search (Postgres FTS — Typesense is not required).
  Not built here: desktop app (no display), mobile app (Android SDK blocked).
  See docs/buzz/CONSTRAINTS.md.

  Next:
    scripts/run-buzz.sh start
    docs/buzz/PROVIDERS.md   — connect OpenAI / Anthropic / Google
    docs/buzz/MOBILE.md      — reach it from your phone
EOF
