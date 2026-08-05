# Block Buzz POC — Engineering Handoff

**Purpose of this document.** A complete, self-contained record of an investigation and
proof-of-concept deployment of [block/buzz](https://github.com/block/buzz), written so
another engineer or AI agent can pick the work up without re-deriving anything. It states
what was done, what was verified and how, what was *wrong* and later corrected, and what
remains open.

| | |
|---|---|
| Repository | `boydyngo/pas-ai` |
| Branch | `claude/block-buzz-install-setup-vr0t1s` |
| Pull request | [#1](https://github.com/boydyngo/pas-ai/pull/1) (draft, open) |
| Date | 2026-07-31 |
| Upstream commit studied | `052174a148f9f6bcbb2b5a1d20ce0317645e49f8` |
| Upstream desktop release | v0.5.2 (2026-07-29) |
| Author | Claude Code (Opus 5), remote cloud session |

---

## 0. Read this first: where the work happened

The build described here ran in an **ephemeral cloud container**, not on the user's
computer. That container is gone. This matters for three reasons:

1. **The running stack no longer exists.** Everything is reproducible from the committed
   scripts, but no live relay survives.
2. **The container had a restrictive egress firewall.** Much of what follows is shaped by
   working around it. On a normal machine, most of those workarounds are unnecessary and
   should be *discarded*, not copied. See §7.
3. **Findings from reading Buzz's source are still valid everywhere.** Findings about the
   sandbox are not. Each section below is labelled.

---

## 1. What Buzz is

An open-source collaboration workspace from Block, Inc., released 2026-07-21 under Apache
2.0. It merges chat and a software forge into one substrate built on the
[Nostr](https://nostr.com) protocol: channels, threads, DMs, canvases, media, search,
audit log, git hosting (NIP-34), and YAML workflows.

The organising idea is **human–agent parity**. Every participant, human or AI, holds a
platform-independent cryptographic keypair. Agents are workspace members with the same
surface area as humans and their own audit trails — not permission-gated bots. Identity
and history travel with the keyholder rather than the platform. Every message, reaction,
workflow step, code review, and git event becomes a signed entry in one unified event log.

Architecture relevant to any follow-on work:

```
Buzz Relay ──WS──→ buzz-acp ──stdio(ACP)──→ agent process
     │                                          │
     │                                     buzz CLI
     └── Postgres (events, FTS) + Redis (pubsub) + S3 (git objects, media)
```

Crates of interest: `buzz-relay` (WebSocket server), `buzz-cli` (**builds a binary named
`buzz`**), `buzz-admin`, `buzz-acp` (ACP harness), `buzz-agent` (native LLM agent),
`buzz-search` (Postgres FTS), `buzz-workflow`.

---

## 2. Deliverables in this branch

6 commits, 11 files, 1577 insertions.

| Path | What it is | Applies off-sandbox? |
|---|---|---|
| `docs/buzz/README.md` | Overview, component status, quick start | Mostly |
| `docs/buzz/PROVIDERS.md` | **OpenAI / Anthropic / Google setup** | **Fully** |
| `docs/buzz/MOBILE.md` | Phone options and their limits | **Fully** |
| `docs/buzz/CONSTRAINTS.md` | Blocked hosts, substitutions, rationale | Historical record |
| `docs/buzz/LOCAL-SETUP.md` | How to run this on a normal machine | **Fully** |
| `docs/buzz/BRIEFING.md` | Narration text of the audio briefing | n/a |
| `docs/buzz/HANDOFF.md` | This document | n/a |
| `scripts/install-buzz.sh` | Source install (Postgres, Redis, moto, cargo, web) | **No — sandbox workaround** |
| `scripts/run-buzz.sh` | start/stop/status/logs/migrate/key | Only if built from source |
| `scripts/run-agent.sh` | Attach an agent, with cost guards | **Fully** |
| `scripts/render-audio.py` | TTS renderer (local Kokoro, or Google Cloud) | **Fully** |

Commit history:

```
fd6b87d  Correct mobile guidance: the web client is a git browser, not a chat client
61cc4d7  Add local setup guide; drop stray __pycache__ artifact
4120b6d  Add local/cloud audio renderer and the briefing narration text
7e3b0f1  Add agent launcher and correct two upstream doc errors found by running it
7dbbe52  Correct component status after verifying the stack end to end
c6e7b7a  Add Block Buzz POC: source install, runbook, and provider/mobile guides
```

Follow-up development on 2026-07-31 added `scripts/test-codex-subscription.sh` for the
reproducible no-key Codex test and `.gitattributes` to preserve LF endings for shell
scripts on Windows checkouts.

---

## 3. Findings from the source — these are universal

These came from reading Buzz's code and running its binaries. They hold on any machine.

### 3.1 Native providers use API keys; Codex ACP can reuse ChatGPT sign-in

ChatGPT Plus/Pro, Claude Pro/Max, and Google AI Pro/Ultra are consumer products. They are
**not** API credentials and do not authenticate native `buzz-agent` providers.

Upstream states it outright in `crates/buzz-acp/README.md`:

> `OPENAI_API_KEY` — **required — use an OpenAI API key, not a ChatGPT subscription.**

**Follow-up verified 2026-07-31:** `codex-acp` 1.1.7 supports its own ChatGPT auth method.
With `OPENAI_API_KEY` and `CODEX_API_KEY` unset, a Codex process spawned by `buzz-acp`
reused an existing ChatGPT login, listed models, received a Buzz mention, and replied
`SUBSCRIPTION ACP OK` after 13 seconds. Claude Code subscription sign-in through
`claude-agent-acp` remains unverified.

### 3.2 There is no native Google/Gemini provider

`BUZZ_AGENT_PROVIDER` accepts exactly: `anthropic`, `openai`, `openrouter`, `databricks`,
`databricks_v2`. That is the complete set.

Gemini is reachable only via **OpenRouter** (`google/gemini-*` model ids) or Block's
internal **Databricks** route. `Provider` is a Rust enum with one `match` in
`Llm::complete`; adding a first-class Google provider is a match arm plus a `body`/`parse`
pair in `crates/buzz-agent/src/llm.rs`. Gemini-specific handling already exists there
(thought-signature replay, prose nested under `summary`, function-name-as-id collisions on
parallel calls), written for the Databricks route — it would largely transfer.

There is **no implicit fallback**: selecting a provider without its key is a startup error.
Verified:

```
$ buzz-agent
ERROR config: BUZZ_AGENT_PROVIDER is required — set it to your provider (e.g. anthropic, openai, databricks)
$ BUZZ_AGENT_PROVIDER=anthropic buzz-agent
ERROR config: ANTHROPIC_API_KEY required
```

### 3.3 Search is Postgres FTS — Typesense is vestigial

`.env.example` defines `TYPESENSE_API_KEY` and `TYPESENSE_URL`, which is misleading.
`crates/buzz-search/src/lib.rs`:

> *Buzz search — community-scoped **Postgres full-text search** over Buzz events. The index
> lives in the `events` table: `search_tsv TSVECTOR GENERATED ALWAYS AS
> (to_tsvector('simple', content)) STORED`, with GIN …*

`grep -rl TYPESENSE crates/ --include=*.rs` returns **nothing**. The Typesense mentions in
`query.rs` are comments describing a prior Typesense-based relay whose semantics the
Postgres implementation reproduces. No Typesense deployment is required.

### 3.4 The relay will not boot without an S3 backend

`crates/buzz-relay/src/main.rs` runs a **fatal** startup gate — the git-on-object-storage
*A3 conformance probe* — which admits the S3 backend against a linearizable
conditional-write (CAS) axiom. It defaults to **on** (`BUZZ_GIT_CONFORMANCE_PROBE` unset ⇒
`true`) and aborts the process on failure:

```
Error: git conformance probe failed: s3 backend error: reqwest: error sending request
for url (http://localhost:9000/buzz-media/packs/…)
```

Set `BUZZ_GIT_CONFORMANCE_PROBE=false` to skip it (git-on-object-storage and media then do
not work).

### 3.5 `BUZZ_WEB_DIR` alone does not serve the web UI

`BUZZ_SERVE_GIT_WEB_GUI` must also be `true`; it defaults to `false`
(`crates/buzz-relay/src/config.rs:908`). Without it, `/` returns the NIP-11 relay-info
JSON to a browser instead of the SPA. The SPA branch in `router.rs` is gated on
`state.config.serve_git_web_gui`.

### 3.6 The web client is a git browser, not a chat client

`web/src/features/` contains exactly two features:

```
repos/    — repo list, repo detail, blob viewer, commits
invite/   — accepting an invite
```

No channel list, no message view, no DMs, no canvas. Loaded in a browser it renders *"This
community is empty… Open this community in the Buzz desktop app"* with an **Open in Buzz**
handoff button. The flag name is accurate: it is a *git web GUI*.

Consequence: **the web client is not a route to Buzz chat on a phone.**

### 3.7 Agent gating and cost defaults

`buzz-acp` gates inbound events by author. Default is `owner-only`, and an agent with **no
registered owner drops every event** while otherwise looking healthy:

```
WARN buzz_acp: respond-to=owner-only but no owner is set — all events will be dropped.
     Set BUZZ_AUTH_TAG or --agent-owner, or use --respond-to=anyone.
```

Set `BUZZ_ACP_AGENT_OWNER` (64-char hex pubkey). Do **not** use `--respond-to anyone` to
silence it on a reachable relay — that is an unmetered path to API spend.

| Variable | Real default | Note |
|---|---|---|
| `BUZZ_ACP_MAX_TURN_DURATION` | `7200` | Two hours of billing per runaway turn |
| `BUZZ_ACP_IDLE_TIMEOUT` | `900` | **Upstream README says 620 — it is stale.** Code: `DEFAULT_IDLE_TIMEOUT_SECS = 900`, and a live run logs `idle_timeout=900s` |
| `BUZZ_ACP_AGENTS` | `1` | 1–32; each is a concurrent billing stream |
| `BUZZ_ACP_HEARTBEAT_INTERVAL` | `0` | Every heartbeat is a paid model call |

Owner control commands (kind:9 messages from the owner, `p`-tagging the agent) bypass the
gate: `!shutdown`, `!cancel`, `!rotate`.

### 3.8 Mobile is not shipped

Block's own README places mobile clients in the **🚧 "Being wired up"** column, not
**✅ "Works today"**. No App Store build, no Play Store build, no APK in releases.
`mobile/pubspec.yaml` is `version: 0.0.0+1`. Push notifications sit in the furthest-out
💭 *"Strong opinions, pending code"* column.

`squareup/buzz-releases`, referenced in the README, is Block-internal and not publicly
accessible.

---

## 4. What was built and verified

**Sandbox-specific**, recorded for reproducibility.

Toolchain: rustc 1.95.0, Node v22.22.2, pnpm 11.4.0, PostgreSQL 16.14, Redis 7.0.15.

Built from source (`cargo build --release`, ~9 min on 4 cores):
`buzz-relay` 0.2.0, `buzz` (from `buzz-cli`), `buzz-admin`, `buzz-acp`, `buzz-agent`.
Web bundle built with Vite (874 KB JS).

### Verification performed

Relay startup log:

```
Database migrations complete
git object-store backend admitted: A3 conformance probe passed
  race_width=32 race_rounds=3 transport_drops=0
Redis conn-control subscriber connected
Config loaded bind_addr=0.0.0.0:3000 health_port=8080 metrics_port=9102
```

Postgres: 54 tables created.

End-to-end via CLI:

```
buzz channels create --name poc-test --type stream --visibility open
  → {"accepted":true,"channel_id":"e373bc4b-…"}
buzz messages send --channel e373bc4b-… --content "…"
  → {"accepted":true,"event_id":"2b05bf70…"}
buzz messages get --channel e373bc4b-…        → returns the message, kind:9, signed
buzz messages search --query Postgres         → hit
buzz messages search --query zzzznonexistent  → []   (negative control)
```

Full cold restart performed; Postgres data persisted. Web UI served (`text/html`, 390 B
index + 874 KB JS asset) and screenshotted at 1440px and 390px.

Agent harness against the live relay:

```
buzz-acp starting: relay=ws://localhost:3000 idle_timeout=300s max_turn=900s
                   respond_to=owner-only
agent initialized: {"agentInfo":{"name":"buzz-agent","version":"0.1.0"},"protocolVersion":2}
connected to relay at ws://localhost:3000
discovered 1 channel(s) / subscribed to channel e373bc4b-…
presence set to online
```

**Follow-up verified:** one live Codex turn completed through ChatGPT subscription auth.
Direct API-key calls against Anthropic, OpenAI, and OpenRouter remain unverified. See §8.

---

## 5. Substitutions made in the sandbox

| Upstream | Used | Justification |
|---|---|---|
| Postgres 17 (Docker) | Postgres 16.14 (apt) | All 26 migrations audited for PG17-only syntax — none found. Only `pgcrypto` required, which 16 provides. |
| Redis 7 (Docker) | Redis 7.0.15 (apt) | Meets the stated requirement |
| MinIO (Docker) | `moto` (PyPI) on `:9000` | MinIO download blocked. moto **passes** the A3 probe. **In-memory — objects do not survive restart.** |
| `ghcr.io/block/buzz:main` | `cargo build --release` | Image blobs blocked |

---

## 6. Environment constraints — sandbox only

Outbound traffic went through a policy-enforcing egress proxy with an allowlist. These are
**network firewall rules, not AI-safety refusals**; no request was declined on policy
grounds, and no attempt was made to route around a block.

**Blocked** (403 / CONNECT tunnel failure):

| Host | Needed for |
|---|---|
| `pkg-containers.githubusercontent.com` | GHCR image blobs |
| `production.cloudfront.docker.com` | Docker Hub image blobs |
| `apt.postgresql.org` | Postgres 17 |
| `dl.min.io` | MinIO |
| `dl.typesense.org` | Typesense |
| `dl.google.com` | Android SDK (APK builds) |
| `github.com/*/releases/download` | Prebuilt release assets |
| `huggingface.co` | Kokoro TTS weights |
| `speech.platform.bing.com` | Edge TTS |
| `api.openai.com`, `api.elevenlabs.io`, `api.naturalreaders.com` | TTS APIs |
| `trycloudflare.com`, `ngrok.com`, `localhost.run` | Tunnels (so no public demo URL) |

**Allowed:** `github.com` (git clone), Ubuntu apt, `index.crates.io`, `registry.npmjs.org`,
`pypi.org`, `storage.googleapis.com`, `texttospeech.googleapis.com`.

Note: `ghcr.io` answers `401` for unauthenticated manifest requests. **A manifest response
is not evidence a pull will succeed** — the blobs live on a blocked host.

---

## 7. What to discard when running elsewhere

On a machine with normal internet, **do not use `scripts/install-buzz.sh`.** Use upstream:

```bash
git clone https://github.com/block/buzz.git && cd buzz
. ./bin/activate-hermit
just setup && just build
just dev            # relay + desktop app together
```

Hermit provisions Rust 1.88+, Node 24+, pnpm 10+, and `just`. Docker supplies real
Postgres 17 and MinIO, so every substitution in §5 becomes unnecessary. For desktop use
only, download a packaged build (`.dmg` / `.exe` / `.AppImage` / `.deb`) from the
[latest release](https://github.com/block/buzz/releases/latest). Windows additionally
needs Git for Windows, since Buzz resolves Git Bash at runtime.

Keep: `PROVIDERS.md`, `MOBILE.md`, `LOCAL-SETUP.md`, `run-agent.sh`, `render-audio.py`.

---

## 8. Open items for whoever picks this up

Ordered by value.

1. **Test Claude Code subscription sign-in through ACP.** Codex is now verified; repeat
   the no-key test with `BUZZ_ACP_AGENT_COMMAND=claude-agent-acp` to determine whether a
   Claude Pro/Max session also survives the harness.
2. **Make one direct API-key call per vendor** (Anthropic, OpenAI, Gemini-via-OpenRouter)
   and confirm an agent answers an `@mention` end to end. Only the Codex ChatGPT
   subscription path has exercised a live model.
3. **Replace moto with real object storage** if anything beyond a POC is intended — moto is
   in-memory and loses every object on restart.
4. **Decide the mobile position.** Either build the Flutter app from source
   (`just mobile-build-android` produces an unsigned debug APK; iOS needs a Mac, Xcode, and
   a signing identity) or wait for upstream. Note push notifications are not implemented.
5. **Consider a native Google provider** if OpenRouter's markup or routing is unacceptable:
   one match arm plus a `body`/`parse` pair in `crates/buzz-agent/src/llm.rs`.
6. **Harden before any exposure.** `BUZZ_REQUIRE_AUTH_TOKEN=false` and the hardcoded dev
   relay keypair are both in play by default; the relay warns about each at startup. Set
   `BUZZ_RELAY_PRIVATE_KEY`, `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true`, and `RELAY_OWNER_PUBKEY`,
   and make `RELAY_URL` match the public URL (it is used in NIP-42 auth challenges).

## 9. Known-good agent launch

```bash
./scripts/run-buzz.sh key                      # mint a keypair per agent; secret is unrecoverable
BUZZ_RELAY_PRIVATE_KEY=<relay key> \
  buzz-admin add-member --pubkey <agent pubkey>

export BUZZ_PRIVATE_KEY=<agent secret>
export BUZZ_ACP_AGENT_OWNER=<your pubkey>      # required, or the agent ignores everything
export ANTHROPIC_API_KEY=sk-ant-...            # or OPENAI_COMPAT_API_KEY / OPENROUTER_API_KEY
./scripts/run-agent.sh anthropic               # openai | gemini | claude-code | codex | goose
```

`run-agent.sh` applies `max_turn=900s` and `idle_timeout=300s` rather than the 7200s
default, and refuses to start with `owner-only` and no owner set. Credentials load from
`scripts/agent.env`, which is gitignored.

---

## 10. Corrections made during this work

Recorded because a handoff that hides its own errors is not trustworthy. Each was caught by
running the thing rather than reading about it.

| Claim | Reality | How it was caught |
|---|---|---|
| "Search is unavailable (Typesense blocked)" | Search works — it is Postgres FTS | Read `buzz-search`; ran positive + negative queries with no Typesense process |
| "Media/object storage unavailable (MinIO blocked)" | Works via moto, which passes the A3 probe | Relay refused to boot at all, forcing the issue |
| "Web client over a tunnel is the phone solution" | Web client is a git repo browser, no chat | Built it, loaded it, read `web/src/features/` |
| Upstream README: idle timeout `620` | `900` | Read `config.rs`; confirmed in a live run |

Two upstream documentation errors were also identified: the stale idle-timeout default,
and the absence of any warning that `owner-only` with no owner silently discards all input.
