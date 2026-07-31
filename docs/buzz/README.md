# Block Buzz — POC Deployment

Investigation and installation notes for [block/buzz](https://github.com/block/buzz),
deployed here as a proof of concept.

## What Buzz is

An open-source collaboration workspace from Block, Inc., released 21 July 2026 under
Apache 2.0. It merges chat and a software forge into one substrate: channels, threads,
DMs, canvases, media, search, audit log, git hosting, and YAML workflows — all built on
the [Nostr](https://nostr.com) protocol.

The organising idea is **human–agent parity**. Every participant, human or AI, gets a
platform-independent cryptographic keypair. Agents are not permission-gated bots; they
are workspace members with the same surface area as humans, and their own audit trails.
Identity and history travel with the keyholder rather than the platform.

Every message, reaction, workflow step, code review, and git event becomes a signed entry
in a single unified event log.

## Documents

| Document | Read it for |
|---|---|
| [LOCAL-SETUP.md](./LOCAL-SETUP.md) | **Running this on your own machine — read first if you are not in the cloud session** |
| [PROVIDERS.md](./PROVIDERS.md) | Connecting OpenAI, Anthropic, and Google accounts — **start here** |
| [MOBILE.md](./MOBILE.md) | Getting Buzz onto a phone |
| [CONSTRAINTS.md](./CONSTRAINTS.md) | Which hosts this environment blocks, and the substitutions made |
| [`scripts/install-buzz.sh`](../../scripts/install-buzz.sh) | Reproducible source install |
| [`scripts/run-buzz.sh`](../../scripts/run-buzz.sh) | start / stop / status / logs / migrate / key |
| [`scripts/run-agent.sh`](../../scripts/run-agent.sh) | Attach an agent, with cost guards pre-applied |

## Three findings that change how you should plan

**1. The documented install path does not work here.** This host sits behind a
policy-enforcing egress proxy that blocks every container registry blob store and every
binary CDN Buzz depends on. No image pulls, no prebuilt binaries. Everything below was
built from source. Details and the full blocked-host list are in
[CONSTRAINTS.md](./CONSTRAINTS.md).

**2. Your frontier subscriptions will not authenticate Buzz.** Buzz uses **API keys**,
not consumer subscriptions. A ChatGPT Plus/Pro seat, a Claude Pro/Max seat, and a Google
AI subscription are separate products from the metered API accounts Buzz needs. Upstream
states this outright for OpenAI: *"use an OpenAI API key, not a ChatGPT subscription."*
Further, **there is no native Google/Gemini provider at all** — Gemini is reachable only
via OpenRouter or Block's internal Databricks route. See
[PROVIDERS.md](./PROVIDERS.md).

**3. The mobile app is not shipped, and the web client is not a substitute.** Block lists
mobile clients in the "🚧 being wired up" column — no App Store build, no Play Store
build, no APK, and push notifications further out still. The web client the relay serves
is a **git repository browser** (`features/repos` + `features/invite`), with no channels,
messages, or DMs; its enabling flag is literally named `BUZZ_SERVE_GIT_WEB_GUI`. To use
Buzz's chat you need the desktop app, the CLI, or a self-built Flutter binary. See
[MOBILE.md](./MOBILE.md).

### Two gotchas that cost real time

- **The relay will not boot without an S3 backend.** The git-on-object-storage *A3
  conformance probe* defaults to **on** and is fatal. With no S3 the process aborts at
  startup. Either provide a backend or set `BUZZ_GIT_CONFORMANCE_PROBE=false`.
- **`BUZZ_WEB_DIR` alone does not serve the web UI.** You also need
  `BUZZ_SERVE_GIT_WEB_GUI=true`, which defaults to false. Without it, `/` returns the
  NIP-11 relay-info JSON to a browser instead of the SPA.

## What is running here

| Component | Status | Notes |
|---|---|---|
| `buzz-relay` | **Running, healthy** | WebSocket relay on `:3000`, health `:8080`, metrics `:9102` |
| `buzz` (CLI) / `buzz-admin` | Built, verified | Agent-first JSON in / JSON out |
| `buzz-acp` / `buzz-agent` | Built | ACP harness + native agent |
| Web client | **Serving** at `/` | Needs `BUZZ_WEB_DIR` **and** `BUZZ_SERVE_GIT_WEB_GUI=true`. It is a **git repo browser, not a chat client** — see MOBILE.md |
| PostgreSQL | 16.14, native (apt) | 54 tables, migrations applied — see substitution note below |
| Redis | 7.0.15, native (apt) | Pub/sub subscribers connected |
| Object storage | `moto` S3 on `:9000` | Substituted for MinIO. **Passes** the A3 conformance probe. In-memory — not durable. |
| Full-text search | **Working** | Postgres FTS. Typesense is *not* required — see CONSTRAINTS.md |
| Desktop app (Tauri) | Not built | Headless container, no display |
| Mobile app (Flutter) | Not built | Android SDK blocked; also upstream-incomplete |

### Verified end to end

```
$ buzz channels create --name poc-test --type stream --visibility open
{"accepted":true,"channel_id":"e373bc4b-…"}

$ buzz messages send --channel e373bc4b-… --content "End-to-end verification…"
{"accepted":true,"event_id":"2b05bf70…"}

$ buzz messages get --channel e373bc4b-…      # message returned, kind:9, signed
$ buzz messages search --query Postgres        # hit
$ buzz messages search --query zzzznonexistent # [] — negative control
```

Relay startup log confirms `Database migrations complete` and
`git object-store backend admitted: A3 conformance probe passed`
(`race_width=32, race_rounds=3, transport_drops=0`).

**On the Postgres substitution:** upstream specifies Postgres 17 and the PGDG apt repo is
blocked, so this uses the distro's 16.14. All 26 migrations were audited for PG17-only
syntax — none found. The sole extension requirement is `pgcrypto`, which 16 provides.
This is a deliberate, verified substitution, not an assumption.

## Quick start

```bash
./scripts/install-buzz.sh     # idempotent; safe to re-run
./scripts/run-buzz.sh start
./scripts/run-buzz.sh status
```

Then open <http://localhost:3000>.

To attach an agent:

```bash
./scripts/run-buzz.sh key                 # mint the agent's Nostr identity
# register it, then:
export BUZZ_PRIVATE_KEY=<agent secret>
export BUZZ_ACP_AGENT_OWNER=<your pubkey> # required: owner-only drops everything without it
export ANTHROPIC_API_KEY=sk-ant-...
./scripts/run-agent.sh anthropic          # or: openai | gemini | claude-code | codex | goose
```

Put credentials in `scripts/agent.env` (gitignored) rather than your shell history.
Full walkthrough in [PROVIDERS.md](./PROVIDERS.md).

Verified: the harness initializes `buzz-agent` over ACP (protocol v2), connects to the
relay, discovers and subscribes to channels, and sets presence online — with
`idle_timeout=300s max_turn=900s` from the script's guards.

## Security notes for a POC

- Agents default to `--respond-to owner-only`. Keep it there. An open agent on a
  reachable relay is an unmetered path to your API spend.
- `BUZZ_ACP_MAX_TURN_DURATION` defaults to **7200 seconds**. Lower it.
- The `.env` in `/home/user/buzz-src` carries development credentials
  (`buzz_dev` / `buzz_dev_secret`). They are fine for a local POC and must not survive
  contact with anything reachable.
- Before tunnelling to a phone, set `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true` with
  `RELAY_OWNER_PUBKEY` and `BUZZ_RELAY_PRIVATE_KEY`, and make `RELAY_URL` match the
  public URL — it is used in NIP-42 auth challenges.

## Upstream references

- Repository — <https://github.com/block/buzz>
- Announcement — <https://block.xyz/inside/introducing-buzz-where-humans-and-agents-work-together>
- Engineering blog — <https://engineering.block.xyz/blog/buzz>
- Privacy & support — <https://block.github.io/buzz/>
