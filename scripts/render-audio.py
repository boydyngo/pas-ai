#!/usr/bin/env python3
"""Render a text briefing to natural-sounding speech.

Two backends, because they run in different places:

  kokoro  — runs LOCALLY on your machine, using the Kokoro install you already
            have (Codespeak / Myorator / EchoType all use it). Fully offline.
            Nothing leaves your computer.

  google  — runs ANYWHERE, including inside a Claude Code remote session, using
            Google Cloud Text-to-Speech. Needs an API key. This is the only
            high-quality backend reachable from the sandboxed session, because
            HuggingFace (Kokoro's weights) and every other TTS host is blocked
            by the environment's egress policy.

Usage
-----
    # On your machine, with your own Kokoro:
    python3 scripts/render-audio.py kokoro docs/buzz/BRIEFING.md briefing.wav

    # Anywhere, with a Google Cloud TTS key:
    export GOOGLE_TTS_API_KEY=...
    python3 scripts/render-audio.py google docs/buzz/BRIEFING.md briefing.mp3

Voices
------
    KOKORO_VOICE   default af_heart   (try: am_michael, bm_george, af_bella)
    GOOGLE_VOICE   default en-US-Chirp3-HD-Charon
                   (also good: en-US-Studio-O, en-US-Neural2-J)
"""
import base64
import json
import os
import re
import sys
import urllib.request

GOOGLE_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize"
# Google caps a single synthesize request at 5000 bytes of input.
GOOGLE_MAX = 4500


def strip_markdown(text):
    """Flatten Markdown so the narrator doesn't read hashes and pipes aloud."""
    text = re.sub(r"```.*?```", " ", text, flags=re.S)      # fenced code
    text = re.sub(r"^\s*\|.*$", "", text, flags=re.M)        # table rows
    text = re.sub(r"^\s{0,3}#{1,6}\s*", "", text, flags=re.M)  # headings
    text = re.sub(r"[*_`>]", "", text)                       # inline markers
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)     # links → label
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


# ---------------------------------------------------------------- kokoro ----
def render_kokoro(text, dst):
    """Local, offline, uses your installed Kokoro. Writes a WAV."""
    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as e:
        sys.exit(
            f"Missing dependency: {e}\n"
            "Install with:  pip install kokoro soundfile numpy\n"
            "Kokoro also needs espeak-ng for phonemization:\n"
            "  macOS:  brew install espeak-ng\n"
            "  Linux:  sudo apt install espeak-ng"
        )

    voice = os.environ.get("KOKORO_VOICE", "af_heart")
    # lang_code follows the voice prefix: a=American, b=British.
    pipeline = KPipeline(lang_code=voice[0])
    print(f"kokoro: voice={voice}", file=sys.stderr)

    chunks = []
    for i, (_, _, audio) in enumerate(pipeline(text, voice=voice, speed=1.0), 1):
        chunks.append(audio)
        if i % 10 == 0:
            print(f"  {i} segments", file=sys.stderr)

    if not chunks:
        sys.exit("kokoro produced no audio")
    sf.write(dst, np.concatenate(chunks), 24000)
    print(f"wrote {dst}", file=sys.stderr)


# ---------------------------------------------------------------- google ----
def chunk_text(text, limit=GOOGLE_MAX):
    """Split on paragraph, then sentence, boundaries under the byte limit."""
    out, buf = [], ""
    for para in text.split("\n\n"):
        para = para.strip()
        if not para:
            continue
        if len(buf) + len(para) + 2 <= limit:
            buf = f"{buf}\n\n{para}".strip()
            continue
        if buf:
            out.append(buf)
        if len(para) <= limit:
            buf = para
            continue
        buf = ""
        for sent in re.split(r"(?<=[.!?])\s+", para):
            if len(buf) + len(sent) + 1 <= limit:
                buf = f"{buf} {sent}".strip()
            else:
                if buf:
                    out.append(buf)
                buf = sent
    if buf:
        out.append(buf)
    return out


def render_google(text, dst):
    """Google Cloud TTS. Writes an MP3 by concatenating per-chunk audio."""
    key = os.environ.get("GOOGLE_TTS_API_KEY")
    if not key:
        sys.exit(
            "GOOGLE_TTS_API_KEY is unset.\n"
            "Create one at console.cloud.google.com → enable the Text-to-Speech API\n"
            "→ APIs & Services → Credentials → Create credentials → API key.\n"
            "Note: this is a Google CLOUD key. It is not your Google AI / Gemini\n"
            "subscription, which cannot authenticate this API."
        )

    voice = os.environ.get("GOOGLE_VOICE", "en-US-Chirp3-HD-Charon")
    lang = "-".join(voice.split("-")[:2])
    pieces = chunk_text(text)
    print(f"google: voice={voice}, {len(pieces)} chunks", file=sys.stderr)

    with open(dst, "wb") as out:
        for i, piece in enumerate(pieces, 1):
            body = json.dumps({
                "input": {"text": piece},
                "voice": {"languageCode": lang, "name": voice},
                # speakingRate slightly under 1.0 measurably helps comprehension
                # on dense technical narration.
                "audioConfig": {"audioEncoding": "MP3", "speakingRate": 0.95},
            }).encode()
            req = urllib.request.Request(
                f"{GOOGLE_ENDPOINT}?key={key}",
                data=body,
                headers={"Content-Type": "application/json"},
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    payload = json.load(r)
            except urllib.error.HTTPError as e:
                sys.exit(f"chunk {i}: {e.code} {e.read().decode()[:400]}")
            out.write(base64.b64decode(payload["audioContent"]))
            print(f"  {i}/{len(pieces)}", file=sys.stderr)
    print(f"wrote {dst}", file=sys.stderr)


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    backend, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    text = strip_markdown(open(src, encoding="utf-8").read())
    if backend == "kokoro":
        render_kokoro(text, dst)
    elif backend == "google":
        render_google(text, dst)
    else:
        sys.exit(f"unknown backend '{backend}' — use 'kokoro' or 'google'")


if __name__ == "__main__":
    main()
