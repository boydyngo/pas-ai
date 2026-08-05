# Connecting Frontier Accounts to Buzz

How to wire OpenAI, Anthropic, and Google models into a Buzz workspace.

---

## Read this first: subscriptions vs. API keys

This is the single most important thing to understand before you start, and it is
the most common source of wasted money and time.

**Native `buzz-agent` providers authenticate with API keys, not consumer subscriptions.**

A ChatGPT Plus/Pro seat, a Claude Pro/Max seat, and a Google AI Pro/Ultra seat are
*consumer product subscriptions*. They entitle you to use the vendor's own chat app.
They are **not** API credentials and are billed separately from API usage. External ACP
adapters are a separate path: modern Codex ACP can reuse a ChatGPT sign-in.

Upstream is explicit about this. From `crates/buzz-acp/README.md`, on the Codex path:

> `OPENAI_API_KEY` — **required — use an OpenAI API key, not a ChatGPT subscription.**

Budget accordingly for native providers. A verified Codex subscription path can remove
the OpenAI API cost for that external-agent route.

### Verified exception: Codex ACP with ChatGPT sign-in

On 2026-07-31, `buzz-acp` at upstream commit `052174a` spawned `codex-acp` 1.1.7
with both `OPENAI_API_KEY` and `CODEX_API_KEY` unset. The adapter reused an existing
ChatGPT login, listed subscription-backed models, and completed an end-to-end Buzz
mention with the exact reply `SUBSCRIPTION ACP OK`.

This does not make a ChatGPT subscription an API credential. It proves that the external
Codex ACP adapter supports its own ChatGPT authentication path. Claude Code subscription
sign-in through `claude-agent-acp` remains unverified.

---

## Two different agent paths

Buzz can drive models two ways. Pick deliberately — they configure differently.

```
Path A — buzz-acp (harness around external agent CLIs)
  Buzz Relay ──WS──→ buzz-acp ──stdio──→ goose | codex-acp | claude-agent-acp
                                                      │
                                                 buzz-cli (send_message, …)

Path B — buzz-agent (native agent, direct HTTPS to the provider)
  Buzz Relay ──WS──→ buzz-acp ──stdio──→ buzz-agent ──HTTPS──→ provider API
```

| | Path A: `buzz-acp` + external CLI | Path B: `buzz-agent` |
|---|---|---|
| Best for | Reusing Claude Code / Codex / Goose behaviour and tooling | Simple, predictable, provider-agnostic agents |
| Config | Whatever that CLI expects | `BUZZ_AGENT_PROVIDER` + key/model env vars |
| Google/Gemini | Only via Goose's own provider config | Only via OpenRouter |
| Recommended for your POC | Anthropic + OpenAI | Google (via OpenRouter) |

---

## Provider support matrix

`buzz-agent` selects a provider with `BUZZ_AGENT_PROVIDER`. The complete supported set,
from `crates/buzz-agent/README.md`:

| Provider | Value | Endpoint | Credential |
|---|---|---|---|
| Anthropic | `anthropic` | `POST {base}/v1/messages` | `ANTHROPIC_API_KEY` |
| OpenAI (and any OpenAI-compatible) | `openai` | `POST {base}/responses` or `/chat/completions` | `OPENAI_COMPAT_API_KEY` |
| OpenRouter | `openrouter` | `POST {base}/chat/completions` | `OPENROUTER_API_KEY` |
| Databricks | `databricks` | `POST {host}/serving-endpoints/{model}/invocations` | OAuth 2.0 PKCE |
| Databricks AI Gateway v2 | `databricks_v2` | `POST {host}/ai-gateway/{provider}/v1/...` | OAuth 2.0 PKCE |

> **There is no native Google or Gemini provider.** This is the key finding for your
> Google account. Gemini is reachable only through **OpenRouter** (`google/gemini-*`
> model ids) or through Block's internal **Databricks** route, which external users do
> not have. `Provider` is a Rust enum with a single `match` in `Llm::complete`; adding a
> first-class Google provider means a match arm and a `body`/`parse` pair in `llm.rs`.

There is **no implicit fallback**: selecting a provider without its key is a startup error.

---

## Step 0 — Prerequisites

A running relay, and a Nostr keypair per agent. Every agent needs its **own** identity.

```bash
cd /home/user/buzz-src

# 1. Mint the agent's identity. SAVE THE SECRET KEY — it is not stored and cannot be recovered.
./target/release/buzz-admin generate-key

# 2. Register its public key as a relay member so it can read and publish.
#    Requires BUZZ_RELAY_PRIVATE_KEY set in the relay env (uncomment in .env) and a relay restart.
BUZZ_RELAY_PRIVATE_KEY=<relay signing key> \
  ./target/release/buzz-admin add-member --pubkey <agent public key>
```

Then, for every path below:

```bash
export BUZZ_PRIVATE_KEY="nsec1..."            # the agent's secret key from step 1
export BUZZ_RELAY_URL="ws://localhost:3000"
```

---

## Anthropic

### Get the credential

1. Go to **console.anthropic.com** — this is the *developer console*, a different
   product from claude.ai. Sign in with the same account.
2. **Settings → API keys → Create key.** Copy it (`sk-ant-...`); it is shown once.
3. **Plans & Billing** — add credit. Console usage is billed separately from any
   Claude Pro/Max subscription you hold.

### Path B — native agent (simplest)

```bash
export BUZZ_AGENT_PROVIDER=anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-sonnet-4-5"
export BUZZ_ACP_AGENT_COMMAND="buzz-agent"
export BUZZ_ACP_AGENT_ARGS=""

./target/release/buzz-acp
```

Optional: `ANTHROPIC_BASE_URL` (default `https://api.anthropic.com`),
`ANTHROPIC_API_VERSION` (default `2023-06-01`).

### Path A — Claude Code via ACP

```bash
npm install -g @agentclientprotocol/claude-agent-acp

export ANTHROPIC_API_KEY="sk-ant-..."
export BUZZ_ACP_AGENT_COMMAND="claude-agent-acp"

./target/release/buzz-acp
```

Older installs exposing `claude-code-acp` also work; `buzz-acp` treats both names as
the same zero-arg runtime.

---

## OpenAI

### Get the credential

1. Go to **platform.openai.com** — again, a different product from chatgpt.com.
2. **API keys → Create new secret key.** Copy it (`sk-...`).
3. **Billing** — add a payment method. **A ChatGPT Plus/Pro subscription does not
   fund API usage.**

### Path B — native agent

```bash
export BUZZ_AGENT_PROVIDER=openai
export OPENAI_COMPAT_API_KEY="sk-..."
export OPENAI_COMPAT_MODEL="gpt-5"
export OPENAI_COMPAT_BASE_URL="https://api.openai.com/v1"
export BUZZ_ACP_AGENT_COMMAND="buzz-agent"
export BUZZ_ACP_AGENT_ARGS=""

./target/release/buzz-acp
```

`OPENAI_COMPAT_API=auto` (the default) selects the **Responses API** for `*.openai.com`
hosts — required for GPT-5 / o-series tool-calling — and **Chat Completions** elsewhere.
Pin explicitly with `OPENAI_COMPAT_API=chat|responses` if your gateway diverges.

### Path A — Codex via ACP

```bash
npm install -g @agentclientprotocol/codex-acp

export BUZZ_ACP_AGENT_COMMAND="codex-acp"

./target/release/buzz-acp
```

`codex-acp` 1.1.7 supports ChatGPT login, API keys, and custom gateways. Sign in with
Codex first, or set `OPENAI_API_KEY` for API billing. Run
`bash ./scripts/test-codex-subscription.sh setup|run|send|get` to reproduce the no-key path.

---

## Google / Gemini — via OpenRouter

Because Buzz has no native Google provider, OpenRouter is the practical route. It is a
metered reseller: you buy OpenRouter credit, and it brokers to Google. **Your Google AI
subscription is not usable here**, and neither is a raw Gemini API key, since there is
no code path that speaks the Gemini wire format.

### Get the credential

1. **openrouter.ai** → sign in → **Keys → Create key** (`sk-or-v1-...`).
2. **Credits** → add balance.

### Configure

```bash
export BUZZ_AGENT_PROVIDER=openrouter
export OPENROUTER_API_KEY="sk-or-v1-..."
export OPENROUTER_MODEL="google/gemini-2.5-pro"   # vendor/model form
export BUZZ_ACP_AGENT_COMMAND="buzz-agent"
export BUZZ_ACP_AGENT_ARGS=""

./target/release/buzz-acp
```

OpenRouter is first-class in `buzz-agent`, not proxied through `provider=openai`:

- `reasoning.effort` is sent when configured; models that cannot reason simply answer
  without reasoning rather than 404.
- `reasoning_details` (opaque extended-thinking payload) is replayed byte-for-byte on
  the next turn, preserving chain-of-thought across multi-turn tool use.
- `anthropic/*` models get Anthropic-style `cache_control` breakpoints injected.
- Error handling: `401` refreshes the key once; `402` (no credits) and `403`
  (guardrail/moderation) fail immediately without retry; `429` and typed
  `provider_overloaded` `503` honour `Retry-After`.

The same route also gives you OpenAI and Anthropic models through one bill
(`openai/gpt-5`, `anthropic/claude-sonnet-4.5`) — worth considering for a POC, since it
collapses three billing relationships into one.

### If you want native Gemini later

Add a `Provider::Google` arm to the enum in `crates/buzz-agent/src/llm.rs` plus one
`body`/`parse` pair. Upstream explicitly documents this as the extension point. Note the
existing Gemini-specific handling already in the codebase (thought-signature replay,
nested `summary` prose, function-name-as-id collisions on parallel calls) — that logic
was written for the Databricks route and would largely transfer.

---

## Running all three at once

Each agent needs its own keypair and its own process. Give each a distinct identity so
you can `@mention` them individually:

```bash
# Terminal 1 — Claude
BUZZ_PRIVATE_KEY=$CLAUDE_NSEC BUZZ_AGENT_PROVIDER=anthropic \
  ANTHROPIC_API_KEY=$ANTHROPIC_KEY ANTHROPIC_MODEL=claude-sonnet-4-5 \
  BUZZ_ACP_AGENT_COMMAND=buzz-agent BUZZ_ACP_AGENT_ARGS="" \
  ./target/release/buzz-acp

# Terminal 2 — GPT
BUZZ_PRIVATE_KEY=$GPT_NSEC BUZZ_AGENT_PROVIDER=openai \
  OPENAI_COMPAT_API_KEY=$OPENAI_KEY OPENAI_COMPAT_MODEL=gpt-5 \
  BUZZ_ACP_AGENT_COMMAND=buzz-agent BUZZ_ACP_AGENT_ARGS="" \
  ./target/release/buzz-acp

# Terminal 3 — Gemini
BUZZ_PRIVATE_KEY=$GEMINI_NSEC BUZZ_AGENT_PROVIDER=openrouter \
  OPENROUTER_API_KEY=$OPENROUTER_KEY OPENROUTER_MODEL=google/gemini-2.5-pro \
  BUZZ_ACP_AGENT_COMMAND=buzz-agent BUZZ_ACP_AGENT_ARGS="" \
  ./target/release/buzz-acp
```

---

## Access control — set this before you expose anything

`buzz-acp` gates which authors reach the agent. **Default is `owner-only`**, and an agent
with no registered owner drops everything until the owner resolves. That default is
correct; understand it before changing it.

| Mode | Behaviour |
|---|---|
| `owner-only` *(default)* | Only the agent's registered owner |
| `allowlist` | Listed 64-char hex pubkeys, plus the owner |
| `anyone` | No filtering — **do not use on a reachable relay** |
| `nobody` | Inbound dropped; agent acts only on heartbeat prompts |

```bash
./target/release/buzz-acp --respond-to allowlist \
  --respond-to-allowlist "abc123…64hex,def456…64hex"
```

Owner control commands are evaluated *before* the gate, so you keep control regardless
of mode. They must be kind:9 stream messages from the owner that `p`-tag the agent:

| Command | Effect |
|---|---|
| `!shutdown` | Graceful exit |
| `!cancel` | Cancel the in-flight turn for that channel |
| `!rotate` | Start the next turn from a fresh ACP session |

### Cost-control knobs

| Variable | Default | Why you care |
|---|---|---|
| `BUZZ_ACP_MAX_TURN_DURATION` | `7200` | Absolute wall-clock cap per turn. A runaway agent bills for **two hours** at this default. |
| `BUZZ_ACP_IDLE_TIMEOUT` | `900` | Cancels a turn after this many seconds of silence. |
| `BUZZ_ACP_AGENTS` | `1` | Subprocess count (1–32). Each is a concurrent billing stream. |
| `BUZZ_ACP_HEARTBEAT_INTERVAL` | `0` (off) | Every heartbeat is a paid model call. Leave off unless you want it. |

> Upstream's `crates/buzz-acp/README.md` states the idle-timeout default is `620`. The
> code disagrees — `DEFAULT_IDLE_TIMEOUT_SECS = 900` in `crates/buzz-acp/src/config.rs`,
> and a live run logs `idle_timeout=900s`. The README is stale; trust `900`.

`scripts/run-agent.sh` applies POC-appropriate values (`max_turn=900`,
`idle_timeout=300`) and keeps `--respond-to owner-only`.

### You must set an owner, or the agent ignores everything

`owner-only` is the default gate, and an agent with no owner drops **all** inbound
events. A live run makes this explicit:

```
WARN buzz_acp: respond-to=owner-only but no owner is set — all events will be
     dropped. Set BUZZ_AUTH_TAG or --agent-owner, or use --respond-to=anyone.
```

Set your own pubkey as the owner:

```bash
export BUZZ_ACP_AGENT_OWNER="<your 64-char hex pubkey>"   # or --agent-owner
```

Do **not** reach for `--respond-to anyone` to make the warning go away — that removes the
only thing standing between a public relay and your API bill.

---

## Verification

```bash
# 1. Relay reachable
curl -sS http://localhost:3000/health

# 2. Agent registered as a member
./target/release/buzz-admin list-members | grep <agent-pubkey>

# 3. Provider credential valid — fastest independent check
curl -sS https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"ping"}]}'

# 4. End-to-end: @mention the agent in a channel and watch buzz-acp stderr.
```

Common failures:

| Symptom | Cause |
|---|---|
| Agent silent on every message | `--respond-to owner-only` with no owner resolved |
| Startup error naming the provider | Provider selected without its API key — there is no fallback |
| `426 Upgrade Required` from `codex-acp` | Expected; confirm `OPENAI_API_KEY` is set for fallback |
| `402` from OpenRouter | Out of credits — fails immediately, no retry |
| Agent cannot read a private channel | Private channels need explicit membership; create via `create_channel` in `buzz-cli` (creator is auto-member). No REST API for member management yet — known upstream gap. |
