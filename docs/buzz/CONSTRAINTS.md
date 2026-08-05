# Environment Constraints — Buzz POC

Recorded so the next engineer does not repeat the discovery work.

## Summary

This container sits behind a policy-enforcing egress proxy (`/root/.ccr/README.md`).
**No container image and no prebuilt binary can be fetched.** The documented Buzz
install path — Docker Compose plus a packaged desktop build — is unavailable here.

Per the proxy README, 403/407 responses are organization policy denials and must be
reported, not routed around. No attempt was made to bypass them.

## Blocked hosts (verified 2026-07-31)

| Host | Needed for | Result |
|---|---|---|
| `pkg-containers.githubusercontent.com` | GHCR image blobs (`ghcr.io/block/buzz:main`) | 403 Forbidden |
| `production.cloudfront.docker.com` | Docker Hub image blobs (postgres, redis, minio) | 403 Forbidden |
| `apt.postgresql.org` | PostgreSQL 17 (PGDG repo) | CONNECT tunnel failed |
| `dl.min.io` | MinIO server binary (S3/media) | CONNECT tunnel failed |
| `dl.typesense.org` | Typesense binary | CONNECT tunnel failed — **turned out not to matter, see below** |
| `dl.google.com` | Android SDK (APK builds) | CONNECT tunnel failed |
| `github.com/*/releases/download` | Any prebuilt release asset | 403 Forbidden |

Reachable, contrary to first expectation:

| Host | Relevance |
|---|---|
| `storage.googleapis.com` | Flutter SDK is downloadable — but the Android SDK is not, so APK builds are still blocked |
| `ghcr.io` (manifests only) | Answers 401 for unauthenticated manifest requests. **A manifest response is not evidence a pull will work** — the blobs are on the blocked host. |

Note `ghcr.io` itself answers (401, as expected for an unauthenticated manifest
request) — only the blob store is blocked. A manifest fetch succeeding is **not**
evidence that a pull will succeed.

## Permitted

| Channel | Notes |
|---|---|
| `git clone` over HTTPS | How the Buzz source was obtained |
| `archive.ubuntu.com` (apt) | Postgres 16, Redis 7, espeak-ng, ffmpeg |
| `index.crates.io` | In the proxy `no_proxy` list — Cargo builds work |
| `registry.npmjs.org` | In the proxy `no_proxy` list — pnpm/npm installs work |
| `pypi.org` | In the proxy `no_proxy` list |

## Consequences for this deployment

| Buzz subsystem | Status | Reason |
|---|---|---|
| Relay, channels, threads, DMs, canvases, audit log | Working | Built from source; verified end to end |
| Web client | Working | Built from source with Vite; served by the relay |
| `buzz`, `buzz-admin`, `buzz-acp`, `buzz-agent` | Working | Built from source |
| Full-text search | **Working** | Typesense was a false alarm — see below |
| Media / git-on-object-storage | **Working (non-durable)** | `moto` S3 substituted for MinIO — see below |
| Desktop app (Tauri) | Not built | Headless container; no display. Use packaged builds on your own machine. |
| Mobile app (Flutter) | Not built | Android SDK blocked; also upstream-incomplete (see MOBILE.md) |

### Search — Typesense is not actually required

`.env.example` defines `TYPESENSE_API_KEY` and `TYPESENSE_URL`, and the Typesense
download host is blocked, so search looked unavailable. **That inference was wrong.**

`crates/buzz-search/src/lib.rs` is explicit:

> *Buzz search — community-scoped **Postgres full-text search** over Buzz events. The
> index lives in the `events` table: `search_tsv TSVECTOR GENERATED ALWAYS AS
> (to_tsvector('simple', content)) STORED`, with GIN …*

No Rust crate reads `TYPESENSE_*` at all — `grep -rl TYPESENSE crates/ --include=*.rs`
returns nothing. The Typesense mentions in `query.rs` are comments describing a *prior*
Typesense-based relay whose query semantics the Postgres implementation reproduces. The
`.env.example` entries are vestigial.

Verified empirically: `buzz messages search --query Postgres` returns the seeded message
and a negative control (`zzzznonexistentterm`) returns `[]`, with no Typesense process
running and no Typesense entry in the relay log.

### Object storage — moto instead of MinIO

The relay runs a **fatal** startup gate: the git-on-object-storage *A3 conformance probe*,
which admits the S3 backend against a linearizable conditional-write (CAS) axiom. It
defaults to **on** (`BUZZ_GIT_CONFORMANCE_PROBE` unset ⇒ true) and aborts boot on failure.
With no S3 backend the relay will not start at all.

MinIO is undownloadable, but PyPI is reachable, so this deployment runs
[`moto`](https://github.com/getmoto/moto) as an S3-compatible server on `:9000`. It
**passes** the probe:

```
git object-store backend admitted: A3 conformance probe passed
  race_width=32 race_rounds=3 transport_drops=0
```

That is a genuine result — moto implements the conditional writes the manifest-pointer
protocol depends on.

> **Caveat: `moto_server` is in-memory.** Objects do not survive a restart. Fine for a
> POC, unacceptable otherwise. For real use, run MinIO (or any S3) where its download is
> not blocked and repoint `BUZZ_S3_ENDPOINT`.

To boot with no object store at all, set `BUZZ_GIT_CONFORMANCE_PROBE=false`. The gate is
skipped and git-on-object-storage and media will not work.

## Substitutions made

| Documented | Used here | Justification |
|---|---|---|
| PostgreSQL 17 (container) | PostgreSQL 16.14 (apt, native) | All 26 migrations audited for PG17-only syntax — none found. Only `pgcrypto` is required, which 16 provides. |
| Redis 7 (container) | Redis 7.0.15 (apt, native) | Meets the stated Redis 7 requirement. |
| `ghcr.io/block/buzz:main` | `cargo build --release` from source | Image blobs blocked. |

## If you run this where egress is open

Ignore all of the above and follow upstream:

```bash
git clone https://github.com/block/buzz.git && cd buzz
. ./bin/activate-hermit
just setup && just build
just dev
```

Hermit provisions Rust 1.88+, Node 24+, pnpm 10+, and `just` automatically.
