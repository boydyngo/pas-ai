Engineering briefing. Block Buzz, proof of concept deployment. Prepared for Boyd. This is the updated version, with two findings corrected since the first recording.

Section one. What we installed.

Buzz is an open source collaboration workspace published by Block, under the Apache two point zero licence. It launched on July twenty first, twenty twenty six. Think of it as Slack and GitHub merged into a single substrate, built on the Nostr protocol. Every message, reaction, code review, and git event becomes a cryptographically signed entry in one unified event log. The distinguishing idea is human agent parity. An A I agent is not a permission gated bot. It is a workspace member, with its own keypair and its own audit trail.

Section two. Environment survey. This is where the plan changed.

I surveyed the host before touching anything. Four C P U cores, fifteen gigabytes of memory, thirty gigabytes of free disk, Rust one point nine four, and P N P M ten. The Docker daemon was not running, so I started it.

Then the bad news. This container sits behind a policy enforcing egress proxy. I tested every dependency host that Buzz needs. The GitHub container registry blob store is blocked. The Docker Hub blob C D N is blocked. The PostgreSQL project apt repository is blocked. The MinIO download site is blocked. The Android S D K is blocked. GitHub release assets are blocked.

The practical consequence. We cannot pull a single container image, and we cannot download a single prebuilt binary. The documented installation path, which is Docker Compose plus a packaged desktop build, does not work on this machine. I did not attempt to route around the policy, and I recommend you do not either.

Section three. What we did instead.

What is permitted is git clone over H T T P S, the Ubuntu package archive, the Rust crates index, and the N P M registry. That is enough to build rather than download.

I cloned the repository. I audited all twenty six database migrations for PostgreSQL seventeen specific syntax and found none. The only requirement is the pgcrypto extension, which sixteen provides. So I substituted PostgreSQL sixteen from the Ubuntu archive, and Redis seven, also from the archive. Then I compiled the relay, the command line interface, the admin tool, the agent harness, and the native agent from source. That took about nine minutes.

Section four. Two corrections to what I told you the first time.

I want to flag these plainly, because I got them wrong on the first pass, and the corrections are good news.

First correction. I told you full text search would be unavailable, because the environment file defines Typesense settings and the Typesense download host is blocked. That inference was wrong. I read the search crate. Buzz search is Postgres full text search. It uses a generated tee ess vector column with a gin index. No Rust crate reads the Typesense variables at all. Those environment entries are left over from an older design. I verified it empirically. A positive query returns the message. A negative control returns an empty list. Search works.

Second correction. I told you media and git object storage would be unavailable, because MinIO cannot be downloaded. Partly wrong. It turns out the relay will not even start without an object store. There is a fatal startup gate called the A three conformance probe, which admits the storage backend against a linearizable conditional write axiom. It defaults to on, and it aborts the boot if it fails. Since the Python package index is reachable, I substituted moto, an S three compatible server. It passes the probe cleanly, with thirty two concurrent writers, three rounds, and zero transport drops. So git on object storage works. The one caveat is that moto is in memory, so objects do not survive a restart. That is fine for a proof of concept and unacceptable for anything else.

Section five. Current status. Everything is running.

The relay is healthy on port three thousand. Migrations applied cleanly, fifty four tables. Redis pub sub is connected. The web client is built and being served. I verified the whole thing end to end. I created a channel, sent a signed message, read it back, and ran both a positive and a negative search. Then I did a full cold restart and confirmed the data persisted.

One more trap worth knowing. Setting the web directory variable alone does not serve the web interface. There is a second flag, serve git web G U I, which defaults to false. Without it, the root path returns the relay information document to a browser instead of the application. That cost me a restart to find.

Section six. Your frontier subscriptions. Please listen closely, because this is the finding most likely to cost you money.

You asked to connect your OpenAI, Anthropic, and Google subscription accounts. I read the provider code directly rather than relying on the marketing description. Buzz authenticates to models with A P I keys, not with consumer subscriptions.

On OpenAI, the Buzz documentation is explicit, and I am quoting it. Use an OpenAI A P I key, not a ChatGPT subscription. Your ChatGPT Plus or Pro seat will not authenticate the Codex adapter. You need a platform A P I key, billed by usage.

On Anthropic, the native agent requires the Anthropic A P I key. That is a console key with usage billing, from console dot anthropic dot com. It is not your Claude Pro or Max seat.

On Google, the finding is stronger. Buzz has no native Google or Gemini provider at all. The supported provider list is Anthropic, OpenAI compatible, OpenRouter, and Databricks. Gemini is reachable only two ways. Through OpenRouter, using a google slash gemini model identifier. Or through Block's internal Databricks route, which you do not have. So your Google A I subscription cannot be attached directly. My recommendation is OpenRouter.

In fact, consider using OpenRouter for all three. It speaks to OpenAI and Anthropic models as well, so it collapses three separate billing relationships into one. For a proof of concept, that is materially simpler.

One honest caveat. The Claude Code and Codex command line tools do support subscription sign in when you run them yourself in a terminal. Whether that session survives when Buzz spawns them as a subprocess is worth testing before you buy credit. But do not plan around it. The upstream documentation describes the A P I key path and only the A P I key path.

Section seven. Cost control. Please do this before you attach any key.

The agent harness defaults to a two hour wall clock cap per turn. A runaway agent will bill you for two hours. I have set the helper script to fifteen minutes instead. The harness also defaults to owner only, meaning it responds only to you. Keep that. An open agent on a reachable relay is an unmetered path to your A P I spend.

Section eight. Mobile.

You asked about your cell phone. The Flutter mobile client exists in the repository, with i O S and Android directories, but Block lists it in the being wired up column, not the works today column. There is no App Store build, no Play Store build, and no A P K in the releases. Push notifications are further out still.

I could not build you a phone binary here. The Flutter S D K is actually downloadable, which surprised me, but the Android S D K is blocked, and i O S would require a Mac with Xcode and a signing identity. So I have written you a verified procedure to run on your own hardware instead.

The realistic option for your phone today is the web client, which is already built and being served by the relay. You reach it over a tunnel, add it to your home screen, and it behaves much like an installed app. Before you tunnel, turn on relay membership enforcement and make the public U R L match the relay U R L setting, because that value is used in the authentication challenge.

Section nine. Deliverables.

Everything is committed to your branch. An install script that captures the whole build. A runbook to start, stop, and check the stack. An agent launcher with the cost guards already applied. A provider guide with the authentication and billing matrix for all three vendors. A mobile guide. And a constraints document recording every blocked host, so the next engineer does not repeat my discovery work.

That is the complete picture. The stack is up and verified. The only thing standing between you and three working agents is three A P I keys.

End of briefing.
