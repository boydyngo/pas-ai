#!/usr/bin/env bash
set -euo pipefail

BUZZ_SRC="${BUZZ_SRC:-$HOME/buzz}"
REL="$BUZZ_SRC/target/release"
STATE_DIR="${BUZZ_TEST_STATE_DIR:-$HOME/.local/state/buzz-codex-subscription-test}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
CODEX_ACP_COMMAND="${CODEX_ACP_COMMAND:-$(command -v codex-acp || true)}"

die() { printf 'error: %s\n' "$*" >&2; exit 1; }
field() { sed -n "s/^$1:  *//p" "$2"; }

require_runtime() {
  [ -x "$REL/buzz" ] || die "missing $REL/buzz"
  [ -x "$REL/buzz-admin" ] || die "missing $REL/buzz-admin"
  [ -x "$REL/buzz-acp" ] || die "missing $REL/buzz-acp"
}

setup() {
  require_runtime
  [ -n "${BUZZ_RELAY_PRIVATE_KEY:-}" ] || die "BUZZ_RELAY_PRIVATE_KEY is required"
  export DATABASE_URL="${DATABASE_URL:-postgres://buzz:buzz_dev@localhost:5432/buzz}"
  export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
  export RELAY_URL="${RELAY_URL:-ws://localhost:3000}"
  export BUZZ_RELAY_URL="${BUZZ_RELAY_URL:-http://localhost:3000}"
  install -d -m 700 "$STATE_DIR"

  for identity in owner agent; do
    key_file="$STATE_DIR/$identity.key"
    if [ ! -f "$key_file" ]; then
      umask 077
      "$REL/buzz-admin" generate-key > "$key_file"
    fi
  done

  owner_public=$(field "Public key" "$STATE_DIR/owner.key")
  agent_public=$(field "Public key" "$STATE_DIR/agent.key")

  for public_key in "$owner_public" "$agent_public"; do
    "$REL/buzz-admin" add-member --pubkey "$public_key"
  done

  owner_secret=$(field "Secret key" "$STATE_DIR/owner.key")
  BUZZ_PRIVATE_KEY="$owner_secret" "$REL/buzz" channels create \
    --name "${BUZZ_TEST_CHANNEL_NAME:-codex-subscription-test}" \
    --type stream --visibility open > "$STATE_DIR/channel.json"
  "$BUZZ_SRC/bin/node" -e \
    'const fs=require("fs"); const value=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(value.channel_id)' \
    "$STATE_DIR/channel.json" > "$STATE_DIR/channel-id"
  BUZZ_PRIVATE_KEY="$owner_secret" "$REL/buzz" channels add-member \
    --channel "$(cat "$STATE_DIR/channel-id")" --pubkey "$agent_public" --role bot

  printf 'Test channel created: %s\n' "$(cat "$STATE_DIR/channel-id")"
}

run_harness() {
  require_runtime
  [ -x "$CODEX_ACP_COMMAND" ] || die "missing Codex ACP adapter: $CODEX_ACP_COMMAND"
  [ -f "$CODEX_HOME/auth.json" ] || die "missing Codex authentication: $CODEX_HOME/auth.json"
  [ -f "$STATE_DIR/channel-id" ] || die "run setup first"

  unset OPENAI_API_KEY CODEX_API_KEY
  export BUZZ_RELAY_URL="${BUZZ_RELAY_URL:-ws://localhost:3000}"
  export CODEX_HOME MODEL_PROVIDER="${MODEL_PROVIDER:-openai}"
  export BUZZ_PRIVATE_KEY="$(field "Secret key" "$STATE_DIR/agent.key")"
  export BUZZ_ACP_AGENT_OWNER="$(field "Public key" "$STATE_DIR/owner.key")"
  export BUZZ_ACP_CHANNELS="$(cat "$STATE_DIR/channel-id")"
  export BUZZ_ACP_AGENT_COMMAND="$CODEX_ACP_COMMAND"
  export BUZZ_ACP_AGENT_ARGS=""
  export BUZZ_ACP_MODEL="${BUZZ_ACP_MODEL:-gpt-5.4-mini[low]}"
  export BUZZ_ACP_MAX_TURN_DURATION="${BUZZ_ACP_MAX_TURN_DURATION:-300}"
  export BUZZ_ACP_IDLE_TIMEOUT="${BUZZ_ACP_IDLE_TIMEOUT:-120}"
  export PATH="$REL:$PATH"

  exec "$REL/buzz-acp" --respond-to "${BUZZ_ACP_RESPOND_TO:-owner-only}"
}

send_test() {
  require_runtime
  [ -f "$STATE_DIR/channel-id" ] || die "run setup first"
  owner_secret=$(field "Secret key" "$STATE_DIR/owner.key")
  agent_public=$(field "Public key" "$STATE_DIR/agent.key")
  channel_id=$(cat "$STATE_DIR/channel-id")
  export BUZZ_RELAY_URL="${BUZZ_RELAY_URL:-http://localhost:3000}"

  BUZZ_PRIVATE_KEY="$owner_secret" "$REL/buzz" messages send \
    --channel "$channel_id" \
    --mention "$agent_public" \
    --content "Reply with exactly: SUBSCRIPTION ACP OK"
}

get_messages() {
  require_runtime
  [ -f "$STATE_DIR/channel-id" ] || die "run setup first"
  owner_secret=$(field "Secret key" "$STATE_DIR/owner.key")
  export BUZZ_RELAY_URL="${BUZZ_RELAY_URL:-http://localhost:3000}"
  BUZZ_PRIVATE_KEY="$owner_secret" "$REL/buzz" messages get \
    --channel "$(cat "$STATE_DIR/channel-id")" --limit 20
}

case "${1:-}" in
  setup) setup ;;
  run) run_harness ;;
  send) send_test ;;
  get) get_messages ;;
  *) die "usage: $0 setup|run|send|get" ;;
esac