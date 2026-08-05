# Getting This Onto Your Own Computer

All the work is on GitHub, on branch `claude/block-buzz-install-setup-vr0t1s`
(pull request #1). Nothing is trapped in the cloud session — that container was only
ever a workspace, and everything worth keeping was committed and pushed.

## 1. Pull the branch

If you already have the repo locally:

```bash
cd path/to/pas-ai
git fetch origin claude/block-buzz-install-setup-vr0t1s
git checkout claude/block-buzz-install-setup-vr0t1s
```

If you don't:

```bash
git clone https://github.com/boydyngo/pas-ai.git
cd pas-ai
git checkout claude/block-buzz-install-setup-vr0t1s
```

That's it. You now have every script and document.

## 2. Important: do **not** run `install-buzz.sh` on your machine

`scripts/install-buzz.sh` is a **workaround**, written for a locked-down cloud container
where container registries and binary CDNs were firewalled off. It builds everything from
source because it had no other option — a nine-minute Rust compile, a Postgres version
substitution, and an in-memory S3 stand-in.

**Your computer has none of those restrictions.** Use Block's normal install instead. It
is dramatically simpler.

### Just want to use Buzz?

Download a packaged build from
[the latest release](https://github.com/block/buzz/releases/latest) — `.dmg` for macOS,
`.exe` for Windows, `.AppImage` or `.deb` for Linux. Install it like any other app.

By default it connects to `ws://localhost:3000`. Point it elsewhere with `BUZZ_RELAY_URL`,
or switch relays inside the app.

### Want to self-host the relay too?

```bash
git clone https://github.com/block/buzz.git && cd buzz
. ./bin/activate-hermit
just setup && just build
just dev              # starts relay + desktop app together
```

Hermit provisions Rust, Node, pnpm, and `just` for you. `just setup` copies `.env`,
downloads tooling, and starts Docker services with migrations applied. You'll get real
Postgres 17 and real MinIO from Docker, so none of my substitutions apply.

On Windows, install [Git for Windows](https://git-scm.com/download/win) first — Buzz
resolves Git Bash at runtime.

## 3. What *is* still worth reading

The environment-specific parts don't transfer, but the findings do — they came from
reading Buzz's source, not from the sandbox:

| Document | Still fully applies? |
|---|---|
| [PROVIDERS.md](./PROVIDERS.md) | **Yes.** API keys vs subscriptions, the missing Google provider, cost guards, the owner-gate trap. All of it. |
| [MOBILE.md](./MOBILE.md) | **Yes**, and more so — you can actually build the APK, since your machine can reach the Android SDK. |
| [README.md](./README.md) | Mostly. Ignore the "what is running here" table; that described the container. |
| [CONSTRAINTS.md](./CONSTRAINTS.md) | Only as a record of why the cloud build looked odd. Two findings inside it are universal: search is Postgres FTS (Typesense is vestigial), and the relay will not boot without an S3 backend. |
| `scripts/run-agent.sh` | **Yes.** The cost guards and the owner check are worth keeping wherever you run it. Point `BUZZ_SRC` at your own checkout. |
| `scripts/install-buzz.sh` | **No.** Restricted-network workaround only. |
| `scripts/run-buzz.sh` | Only if you built from source. With `just dev`, use that instead. |

## 4. Rendering the briefing audio with your own Kokoro

This is the part that genuinely needs your machine — the cloud container had no sound
hardware, no Kokoro, and no route to download its weights.

```bash
pip install kokoro soundfile numpy
# Kokoro needs espeak-ng for phonemization:
#   macOS:  brew install espeak-ng
#   Linux:  sudo apt install espeak-ng

python3 scripts/render-audio.py kokoro docs/buzz/BRIEFING.md briefing.wav
```

Pick a voice with `KOKORO_VOICE` (`af_heart` default; try `am_michael`, `bm_george`,
`af_bella`).

Or skip the script entirely: `docs/buzz/BRIEFING.md` is plain text. Paste it into
NaturalReader and let the voices you already pay for read it.

## 5. Merging the branch

The pull request is open as a draft at
<https://github.com/boydyngo/pas-ai/pull/1>. Mark it ready and merge whenever you're
satisfied. There's no CI on it — this repo's only workflow deploys to GitHub Pages on
pushes to `main`, and doesn't run on pull requests.
