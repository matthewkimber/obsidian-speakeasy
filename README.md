# Speakeasy

An Obsidian plugin that records conversations, transcribes them with [Whisper](https://github.com/openai/whisper), and writes structured transcript notes directly into your vault — all locally, with no data leaving your machine.

**Features:**

- One-click recording from a ribbon icon or command palette
- Timestamped transcripts with `[MM:SS] text` formatting
- Speaker diarization — consecutive segments are grouped under `**Speaker 1**`, `**Speaker 2**`, etc.
- YAML frontmatter on every note: `date`, `duration`, `audio` path, and `speakers` list
- Configurable Whisper model size, microphone device, and output folders
- Status bar indicator and non-blocking async transcription

> **Desktop only.** Requires a running [local backend](#backend-setup) for transcription.

---

## How it works

```
Obsidian plugin  →  POST /transcribe  →  Backend
                                          ├── Whisper (speech-to-text)
                                          └── Pyannote (speaker diarization, optional)
                    ←  JSON segments  ←
                    writes .md note to vault
```

The plugin talks to a small FastAPI server (`backend/`) that runs on `localhost:8765`. The server does the heavy lifting: it runs Whisper for transcription and, if a Hugging Face token is configured, runs Pyannote for speaker diarization.

---

## Backend setup

**Prerequisites:** Python 3.11+, [uv](https://github.com/astral-sh/uv)

```bash
cd backend

# Create venv and install dependencies
uv venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

uv pip install -r requirements.txt

# Optional: speaker diarization requires a Hugging Face token.
# Accept the pyannote/speaker-diarization-3.1 model terms on huggingface.co first.
cp .env.example .env
# Edit .env and set HUGGINGFACE_TOKEN=hf_...
```

**Start the server:**

```bash
uvicorn main:app --host 127.0.0.1 --port 8765 --reload
```

The API is now available at `http://localhost:8765`. Visit `/health` to verify it's running and see which Whisper models are cached.

**First transcription** triggers a one-time model download from OpenAI (size depends on the model you select in settings — `base` is ~140 MB).

---

## Autostart the backend

You'll probably want the backend to start automatically when you log in rather than running the command manually each time.

### macOS — launchd

Create `~/Library/LaunchAgents/com.speakeasy.backend.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.speakeasy.backend</string>
  <key>ProgramArguments</key>
  <array>
    <string>/path/to/obsidian-speakeasy/backend/.venv/bin/uvicorn</string>
    <string>main:app</string>
    <string>--host</string><string>127.0.0.1</string>
    <string>--port</string><string>8765</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/path/to/obsidian-speakeasy/backend</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/speakeasy-backend.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/speakeasy-backend.log</string>
</dict>
</plist>
```

Replace `/path/to/obsidian-speakeasy` with the actual path, then load it:

```bash
launchctl load ~/Library/LaunchAgents/com.speakeasy.backend.plist
```

### Linux — systemd

Create `~/.config/systemd/user/speakeasy-backend.service`:

```ini
[Unit]
Description=Speakeasy transcription backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/obsidian-speakeasy/backend
ExecStart=/path/to/obsidian-speakeasy/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8765
Restart=on-failure

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user daemon-reload
systemctl --user enable --now speakeasy-backend
```

### Windows — Task Scheduler

1. Open **Task Scheduler** → **Create Basic Task**
2. Set **Trigger** → "When I log on"
3. Set **Action** → "Start a program"
   - Program: `C:\path\to\obsidian-speakeasy\backend\.venv\Scripts\uvicorn.exe`
   - Arguments: `main:app --host 127.0.0.1 --port 8765`
   - Start in: `C:\path\to\obsidian-speakeasy\backend`
4. Check "Run only when user is logged on"

Alternatively, install [NSSM](https://nssm.cc/) for more robust service management.

---

## Plugin setup (using the plugin)

1. Build the plugin: `npm run build` (produces `main.js`)
2. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/speakeasy/`
3. Enable the plugin in Obsidian → Settings → Community plugins

Or symlink this repo directory directly into `.obsidian/plugins/speakeasy/` and run `npm run dev` for live reloading during development.

---

## Contributing

### Prerequisites

- Node.js 20+
- Python 3.11+ (for backend work)
- [uv](https://github.com/astral-sh/uv) (for backend dependency management)

### Plugin

```bash
npm install          # install dependencies
npm run dev          # watch mode — rebuilds main.js on save
npm run build        # type-check + production build
npm test             # run Vitest unit tests
npm run test:watch   # test watch mode
npm run lint         # ESLint (must pass before opening a PR)
```

All commands run from the repo root.

### Backend

```bash
cd backend
source .venv/bin/activate       # activate the venv you created above
uvicorn main:app --reload       # start the dev server

pytest                          # run unit tests (no live backend needed)
pytest -m "not e2e"             # skip tests that require a running server
```

### Project structure

```
backend/                  FastAPI transcription server
  main.py                 Routes and request/response models
  transcribe.py           Whisper transcription (run_whisper)
  diarize.py              Pyannote diarization (run_pyannote)
  merge.py                Assigns Whisper segments to Pyannote speakers
  tests/                  Backend unit tests

src/                      Obsidian plugin (TypeScript)
  main.ts                 Plugin entry point
  settings.ts             Settings interface and tab UI
  types.ts                Shared TypeScript types
  audio/
    recorder.ts           MediaRecorder wrapper
    converter.ts          PCM → WAV encoding
  commands/
    index.ts              Command registration entry point
    record.ts             Start/stop recording, transcription orchestration
  ui/
    status.ts             Status bar indicator
  utils/
    api.ts                Backend HTTP calls (requestUrl)
    note-writer.ts        Transcript note formatting and vault writes

tests/                    Vitest unit tests (mirrors src/ structure)
__mocks__/obsidian.ts     Obsidian API mock for tests
specs/                    Phase specs and design documents
```

### Running tests

The plugin test suite uses Vitest with a jsdom environment. Tests mock the Obsidian API — no live Obsidian instance is needed.

```bash
npm test                  # single run
npm run test:watch        # interactive watch mode
npm run test:coverage     # with V8 coverage report
```

### Lint

The project uses ESLint with [`eslint-plugin-obsidianmd`](https://github.com/obsidianmd/eslint-plugin) for Obsidian-specific rules. Lint must pass before a PR is opened.

```bash
npm run lint
```

### CI

GitHub Actions runs `npm install → npm run build → npm test → npm run lint` on every push and PR, against Node 20 and 22.

---

## API reference

The backend exposes three endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `{"status": "ok", "models": [...]}` |
| `GET` | `/models` | Lists Whisper models cached on disk |
| `POST` | `/transcribe` | Transcribe a WAV file |

**POST /transcribe** form fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `audio` | file | required | WAV file (16 kHz mono recommended) |
| `whisper_model` | string | `base` | `tiny` / `base` / `small` / `medium` / `large` |
| `num_speakers` | int | `null` | Speaker count hint for diarization |

---

## Privacy

All audio processing is local. No audio, transcripts, or personal data are sent to any external service. The only outbound network calls are one-time model downloads (Whisper from OpenAI CDN, Pyannote from Hugging Face) gated by your own credentials.
