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
| `dl.typesense.org` | Typesense binary (search) | CONNECT tunnel failed |
| `github.com/*/releases/download` | Any prebuilt release asset | 403 Forbidden |

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
| Relay, channels, threads, DMs, canvases, audit log | Available | Built from source |
| Web client | Available | Built from source with Vite |
| `buzz-cli`, `buzz-admin`, ACP agent harness | Available | Built from source |
| Full-text search | **Unavailable** | Typesense binary undownloadable |
| Media upload / git-on-object-storage | **Unavailable** | MinIO binary undownloadable |
| Desktop app (Tauri) | **Not built** | Headless container; no display. Use packaged builds on your own machine. |
| Mobile app (Flutter) | **Not built** | Flutter SDK download blocked; also upstream-incomplete (see MOBILE.md) |

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
