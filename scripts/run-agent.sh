#!/usr/bin/env bash
#
# run-agent.sh — attach an AI agent to the Buzz relay.
#
#   ./scripts/run-agent.sh anthropic|openai|gemini|claude-code|codex|goose
#
# Reads credentials from the environment (or scripts/agent.env if present).
# See docs/buzz/PROVIDERS.md for how to obtain each credential.
#
# IMPORTANT: Buzz authenticates with metered API keys, NOT consumer
# subscriptions. A ChatGPT Plus/Pro, Claude Pro/Max, or Google AI seat will not
# work here. There is no native Google provider — Gemini goes via OpenRouter.
#
set -euo pipefail

BUZZ_SRC="${BUZZ_SRC:-/home/user/buzz-src}"
REL="$BUZZ_SRC/target/release"
ENV_FILE="${ENV_FILE:-$(dirname "$0")/agent.env}"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

# agent.env is gitignored — keep keys out of the repo.
[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; log "Loaded $ENV_FILE"; }

PROVIDER="${1:-}"
[ -n "$PROVIDER" ] || die "usage: $0 anthropic|openai|gemini|claude-code|codex|goose"

[ -x "$REL/buzz-acp" ] || die "buzz-acp not built — run: cargo build --release -p buzz-acp -p buzz-agent"

# --- identity ---------------------------------------------------------------
# Every agent needs its OWN Nostr keypair. Mint one with:
#     ./scripts/run-buzz.sh key
# then register it so the relay will accept its reads and writes:
#     BUZZ_RELAY_PRIVATE_KEY=<relay key> buzz-admin add-member --pubkey <agent pubkey>
[ -n "${BUZZ_PRIVATE_KEY:-}" ] || die "BUZZ_PRIVATE_KEY unset — mint one with ./scripts/run-buzz.sh key"
export BUZZ_RELAY_URL="${BUZZ_RELAY_URL:-ws://localhost:3000}"

# --- cost / blast-radius guards ---------------------------------------------
# Upstream defaults are generous: a 7200s turn cap and owner-only gating. Keep the
# gate, and tighten the cap for a POC — a runaway turn bills for two hours.
export BUZZ_ACP_MAX_TURN_DURATION="${BUZZ_ACP_MAX_TURN_DURATION:-900}"
export BUZZ_ACP_IDLE_TIMEOUT="${BUZZ_ACP_IDLE_TIMEOUT:-300}"
RESPOND_TO="${BUZZ_ACP_RESPOND_TO:-owner-only}"

# owner-only with no owner set drops EVERY inbound event — the harness warns about
# this and then sits there looking healthy while ignoring you. Fail loudly instead.
if [ "$RESPOND_TO" = "owner-only" ] && [ -z "${BUZZ_ACP_AGENT_OWNER:-}" ] && [ -z "${BUZZ_AUTH_TAG:-}" ]; then
  die "respond-to=owner-only requires BUZZ_ACP_AGENT_OWNER (your 64-char hex pubkey).
     Set it, or set BUZZ_AUTH_TAG. Do not use --respond-to anyone to work around this."
fi

need() { [ -n "${!1:-}" ] || die "$1 is required for provider '$PROVIDER' — see docs/buzz/PROVIDERS.md"; }

case "$PROVIDER" in

  # ---- Path B: native buzz-agent, direct HTTPS to the provider --------------
  anthropic)
    need ANTHROPIC_API_KEY
    export BUZZ_AGENT_PROVIDER=anthropic
    export ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-sonnet-4-5}"
    export BUZZ_ACP_AGENT_COMMAND="$REL/buzz-agent"
    export BUZZ_ACP_AGENT_ARGS=""
    ;;

  openai)
    need OPENAI_COMPAT_API_KEY
    export BUZZ_AGENT_PROVIDER=openai
    export OPENAI_COMPAT_MODEL="${OPENAI_COMPAT_MODEL:-gpt-5}"
    export OPENAI_COMPAT_BASE_URL="${OPENAI_COMPAT_BASE_URL:-https://api.openai.com/v1}"
    # auto → Responses API for *.openai.com (required for GPT-5/o-series tool calls)
    export OPENAI_COMPAT_API="${OPENAI_COMPAT_API:-auto}"
    export BUZZ_ACP_AGENT_COMMAND="$REL/buzz-agent"
    export BUZZ_ACP_AGENT_ARGS=""
    ;;

  gemini|google|openrouter)
    # There is no native Google provider in buzz-agent. OpenRouter is the route.
    need OPENROUTER_API_KEY
    export BUZZ_AGENT_PROVIDER=openrouter
    export OPENROUTER_MODEL="${OPENROUTER_MODEL:-google/gemini-2.5-pro}"
    export BUZZ_ACP_AGENT_COMMAND="$REL/buzz-agent"
    export BUZZ_ACP_AGENT_ARGS=""
    ;;

  # ---- Path A: external agent CLIs over ACP --------------------------------
  claude-code)
    need ANTHROPIC_API_KEY
    command -v claude-agent-acp >/dev/null \
      || die "install first: npm install -g @agentclientprotocol/claude-agent-acp"
    export BUZZ_ACP_AGENT_COMMAND="claude-agent-acp"
    ;;

  codex)
    need OPENAI_API_KEY
    command -v codex-acp >/dev/null \
      || die "install first: npm install -g @agentclientprotocol/codex-acp"
    export BUZZ_ACP_AGENT_COMMAND="codex-acp"
    warn "codex-acp always tries a ChatGPT WebSocket login first and logs"
    warn "'426 Upgrade Required'. That is expected and non-fatal — it falls back"
    warn "to OPENAI_API_KEY."
    ;;

  goose)
    command -v goose >/dev/null || die "goose not found on PATH"
    export GOOSE_MODE="${GOOSE_MODE:-auto}"
    export BUZZ_ACP_AGENT_COMMAND="goose"
    export BUZZ_ACP_AGENT_ARGS="acp"
    ;;

  *) die "unknown provider '$PROVIDER'" ;;
esac

log "provider=$PROVIDER  agent=${BUZZ_ACP_AGENT_COMMAND}"
log "relay=$BUZZ_RELAY_URL  respond-to=$RESPOND_TO"
log "max-turn=${BUZZ_ACP_MAX_TURN_DURATION}s  idle-timeout=${BUZZ_ACP_IDLE_TIMEOUT}s"

exec "$REL/buzz-acp" --respond-to "$RESPOND_TO" "${@:2}"
