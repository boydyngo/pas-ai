# Buzz on Your Phone

## Status: the native mobile app is not shipped yet

Block's own README puts mobile in the **🚧 "Being wired up"** column, not the
**✅ "Works today"** column:

| ✅ Works today | 🚧 Being wired up |
|---|---|
| Relay, channels, threads, DMs, canvases, media, search, audit log | **Mobile clients (iOS + Android, Flutter)** |
| Desktop app (Tauri + React) | Workflow approval gates |
| `buzz-cli` + ACP harness | Huddle lifecycle events |

Concretely, that means:

- **No App Store build. No Play Store build. No APK in releases.**
- The Flutter source exists (`mobile/` with `ios/` and `android/` directories), and
  there is a real `mobile/CHANGELOG.md`, but it is pre-1.0 (`version: 0.0.0+1`).
- **Push notifications** are in the 💭 *"Strong opinions, pending code"* column — the
  furthest-out tier. A `buzz-push-gateway` crate and Helm chart exist, but do not expect
  working phone notifications.

There is also a Block-internal distribution at `squareup/buzz-releases` referenced in the
README. That is for Block employees; it is not publicly accessible.

### Why I could not build you an APK here

| Requirement | Status in this container |
|---|---|
| Flutter SDK (Dart `^3.11.4`) | `storage.googleapis.com` reachable — **installable** |
| Android SDK / build-tools | `dl.google.com` **blocked** by egress policy, not preinstalled |
| JDK | Present (`/usr/bin/javac`) |
| Xcode + Apple signing identity (iOS) | Impossible — requires macOS hardware |

Android SDK is the hard stop. See [CONSTRAINTS.md](./CONSTRAINTS.md).

---

## Correction: the web client is NOT a chat client

An earlier draft of this document recommended the web client over a tunnel as the way to
use Buzz on a phone. **That was wrong**, and it was wrong because I recommended it before
looking at it. Having now built and run it:

The web bundle the relay serves has exactly two features:

```
web/src/features/
├── repos/     — repo list, repo detail, blob viewer, commits
└── invite/    — accepting an invite
```

There is **no channel list, no message view, no DM, no canvas**. Loading it shows a git
community browser and a button that hands off to the desktop app:

> **This community is empty.** Repositories pushed to this community will show up here.
> Open this community in the Buzz desktop app to start pushing code.
> `[ Open in Buzz ]`

The env var that enables it is named accurately — `BUZZ_SERVE_GIT_WEB_GUI`. It is a *git
web GUI*, not the Buzz client.

## So what can you actually do on a phone today?

Honestly: **there is no good way to use Buzz's chat on a phone right now.** Ranked by how
usable they are:

| Option | Verdict |
|---|---|
| **Build the Flutter app from source** | The only real path to chat on a phone. Pre-1.0 (`version: 0.0.0+1`), no push notifications. Instructions below. |
| **`buzz` CLI over SSH** | Genuinely workable if you live in a terminal. `buzz messages get/send`, `buzz channels list` all work from a phone SSH client. Agent-first, not pretty. |
| **Web client over a tunnel** | Only if you want to *browse repos* from your phone. Not chat. |
| **Desktop app** | Works well — but that means a laptop, not a phone. |

If chat on your phone is the actual requirement, the honest answer is to wait until Block
moves mobile out of the "🚧 being wired up" column. Push notifications are further out
still, and a chat app without them has limited value on a phone anyway.

## Serving the web client anyway (repo browsing)

The web client is built at `web/dist`.

### 1. Point the relay at the bundle

In `/home/user/buzz-src/.env`:

```bash
BUZZ_WEB_DIR=./web/dist
BUZZ_BIND_ADDR=0.0.0.0:3000
```

Restart the relay. It now serves the UI at `/` for browser requests.

### 2. Expose it

On a laptop on the same Wi-Fi as your phone, just browse to
`http://<laptop-lan-ip>:3000`. Otherwise use a tunnel:

```bash
# cloudflared
cloudflared tunnel --url http://localhost:3000

# or ngrok — note this repo already ships an ngrok.yml
ngrok http 3000
```

### 3. On the phone

1. Open the tunnel's HTTPS URL in Safari or Chrome.
2. **Add to Home Screen** — it behaves much like an installed app.

Remember what you get: a repository browser. Not chat.

### Security — read before tunnelling

A tunnel puts your relay on the public internet. Before you do that:

- **`RELAY_URL` must match the public URL.** It is used in NIP-42 auth challenges; a
  mismatch breaks authentication.
- Set `BUZZ_REQUIRE_RELAY_MEMBERSHIP=true` with `RELAY_OWNER_PUBKEY` and
  `BUZZ_RELAY_PRIVATE_KEY`, so only registered members can read or publish.
- Keep every agent at `--respond-to owner-only`. An open agent on a public relay is an
  unmetered spend path — anyone who can post can bill your API keys.
- Prefer HTTPS (the tunnel gives you this) so keys are not sent in clear text.
- Treat the tunnel as temporary. Shut it down when you are done.

---

## Building the native app yourself

On your own machine, where downloads are not blocked.

### Android

Needs: Flutter SDK, Android SDK + build-tools, JDK 17+.

```bash
git clone https://github.com/block/buzz.git && cd buzz
. ./bin/activate-hermit

cd mobile && flutter pub get && cd ..

# Unsigned debug APK
just mobile-build-android
# → mobile/build/app/outputs/flutter-apk/app-debug.apk
```

Transfer to the phone and install with "unknown sources" enabled. Point it at your relay
via `BUZZ_RELAY_URL`, or switch relays in-app. Because the APK is a **debug** build it is
unsigned, slower, and not suitable for anything but a POC.

### iOS

Needs: a Mac, Xcode, and an Apple Developer signing identity.

```bash
cd mobile && flutter pub get
just mobile-dev          # boots simulator + relay + Docker
# or, on a physical device:
flutter run --release
```

Sideloading to a physical iPhone requires a provisioning profile. With a free Apple ID
the build expires after 7 days and must be reinstalled.

### Worktree-aware debug identity — worth knowing

Debug builds from a git worktree get a unique app id keyed to the **worktree directory
name** (`com.buzz.buzzMobile.<slug>` on iOS, `xyz.block.buzz.mobile.<slug>` on Android),
plus a branch label in the app name (`Buzz (my-branch)`). The identifier follows the
directory, not the branch — so one worktree keeps one installed app and its login state
across branch switches, and builds from different worktrees install side by side. Release
and profile builds always keep the production identity.

`just mobile-dev` and `just mobile-build-android` apply this automatically via
`scripts/mobile-worktree-overrides.sh`.

---

## Recommendation

For a POC, **use the web client over a tunnel.** It works today, needs no SDK, no signing
identity, and no app store. Revisit the native app when Block moves mobile into the
"Works today" column — at which point push notifications will likely have landed too, and
that is what actually makes a chat app useful on a phone.
