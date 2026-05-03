# Technical Requirements Document

## Obsidian Transcription & Annotation Plugin

**Version:** 1.0  
**Status:** Draft  
**Author:** Matteo (via Claude)  
**Last Updated:** 2026-05-03

---

## 1. System Architecture

### 1.1 High-Level Overview

The system consists of two components:

1. **Obsidian Plugin** — TypeScript/Electron frontend responsible for audio capture, UI, orchestration, and note generation
2. **Local Python Backend** — FastAPI service responsible for transcription (Whisper) and speaker diarization (Pyannote)

These communicate over localhost HTTP. Ollama is a third-party service the plugin calls directly—no mediation through the backend.

```
┌─────────────────────────────────┐
│         Obsidian (Electron)      │
│  ┌──────────────────────────┐   │
│  │   Plugin (TypeScript)    │   │
│  │  - Audio capture (Web    │   │
│  │    Audio API)            │   │
│  │  - UI / Ribbon / Commands│   │
│  │  - Template engine       │   │
│  │  - Note writer           │   │
│  └───────────┬──────────────┘   │
└──────────────┼──────────────────┘
               │ HTTP (localhost)
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────────┐  ┌───────────────┐
│ Python       │  │ Ollama        │
│ Backend      │  │ (localhost:   │
│ (FastAPI)    │  │  11434)       │
│ - Whisper    │  │ - LLM model   │
│ - Pyannote   │  │   (user conf) │
└──────────────┘  └───────────────┘
```

### 1.2 Component Responsibilities

| Component       | Responsibility                                                                         |
| --------------- | -------------------------------------------------------------------------------------- |
| Obsidian Plugin | Audio capture, UI state, backend orchestration, template rendering, note file creation |
| Python Backend  | Whisper transcription, Pyannote diarization, result merging, JSON response             |
| Ollama          | LLM inference for annotation prompts defined in templates                              |

---

## 2. Technology Stack

### 2.1 Obsidian Plugin

| Concern         | Technology                                      | Version        |
| --------------- | ----------------------------------------------- | -------------- |
| Language        | TypeScript                                      | 5.x            |
| Runtime         | Electron (via Obsidian)                         | Latest stable  |
| Build tool      | esbuild                                         | Latest         |
| Plugin scaffold | obsidian-plugin-template                        | Latest         |
| Audio capture   | Web Audio API + MediaRecorder API               | Browser native |
| HTTP client     | Fetch API                                       | Browser native |
| Template engine | Custom variable substitution (or Handlebars.js) | Latest         |
| Obsidian API    | obsidian npm package                            | 1.0+           |

### 2.2 Python Backend

| Concern          | Technology         | Version |
| ---------------- | ------------------ | ------- |
| Language         | Python             | 3.11+   |
| Package manager  | uv                 | Latest  |
| Linter/formatter | ruff               | Latest  |
| Web framework    | FastAPI            | 0.110+  |
| ASGI server      | Uvicorn            | Latest  |
| Transcription    | openai-whisper     | Latest  |
| Diarization      | pyannote.audio     | 3.x     |
| Audio processing | librosa, soundfile | Latest  |
| Config           | pydantic-settings  | Latest  |
| Project config   | pyproject.toml     | —       |

### 2.3 LLM Runtime

| Concern          | Technology                               |
| ---------------- | ---------------------------------------- |
| Inference engine | Ollama                                   |
| Default model    | llama3 (user configurable)               |
| Interface        | Ollama REST API (http://localhost:11434) |
| Protocol         | HTTP POST /api/chat or /api/generate     |

---

## 3. Python Backend API Contract

Base URL: `http://localhost:8765` (configurable)

### 3.1 POST /transcribe

Accepts audio file, returns merged transcript with speaker labels and timestamps.

**Request:**

```
Content-Type: multipart/form-data
Fields:
  - audio: binary (WAV file, 16kHz 16-bit mono)
  - whisper_model: string (tiny | base | small | medium | large), default: base
  - num_speakers: integer (optional hint for diarization), default: null
```

**Response:**

```json
{
	"duration_seconds": 1842.5,
	"segments": [
		{
			"start": 0.0,
			"end": 4.3,
			"speaker": "Speaker 1",
			"text": "Thanks everyone for joining today."
		},
		{
			"start": 4.5,
			"end": 9.1,
			"speaker": "Speaker 2",
			"text": "Happy to be here. Let's get started."
		}
	]
}
```

**Error responses:**

```json
{ "error": "whisper_model_not_found", "detail": "Model 'large' is not downloaded." }
{ "error": "audio_too_short", "detail": "Audio must be at least 5 seconds." }
{ "error": "pyannote_token_missing", "detail": "Set HUGGINGFACE_TOKEN in backend .env." }
```

### 3.2 GET /health

Returns backend status and available Whisper models.

**Response:**

```json
{
	"status": "ok",
	"whisper_available": true,
	"pyannote_available": true,
	"available_models": ["tiny", "base", "small"]
}
```

### 3.3 GET /models

Returns list of locally downloaded Whisper models.

**Response:**

```json
{
	"models": ["tiny", "base", "small"]
}
```

---

## 4. Ollama API Contract

The plugin calls Ollama directly. No mediation through the Python backend.

**Endpoint:** `{ollama_base_url}/api/generate`

**Request:**

```json
{
	"model": "llama3",
	"prompt": "<assembled from template + transcript>",
	"stream": false
}
```

**Response (relevant fields):**

```json
{
	"response": "<LLM output text>"
}
```

Each LLM prompt block in a template results in one POST call. Results are collected and injected into the final note.

---

## 5. Plugin Settings Schema

Settings are persisted in `.obsidian/plugins/obsidian-transcribe/data.json`.

```typescript
interface PluginSettings {
	// Backend
	backendUrl: string; // default: "http://localhost:8765"
	whisperModel: "tiny" | "base" | "small" | "medium" | "large"; // default: "base"

	// Ollama
	ollamaEnabled: boolean; // default: true
	ollamaBaseUrl: string; // default: "http://localhost:11434"
	ollamaModel: string; // default: "llama3"

	// Audio
	microphoneDeviceId: string; // default: "" (system default)
	audioOutputFolder: string; // default: "Recordings"

	// Notes
	noteOutputFolder: string; // default: "Transcripts"
	defaultTemplate: string; // default: "Meeting Notes"
	templateFolder: string; // default: "Templates/Transcription"

	// UI
	showStatusBar: boolean; // default: true
}
```

---

## 6. Template File Format

Templates are markdown files with YAML frontmatter and special LLM prompt blocks.

```markdown
---
name: Meeting Notes
description: General team meetings with action items and decisions
version: 1.0
---

# {{title}}

**Date:** {{date}}  
**Duration:** {{duration}}  
**Speakers:** {{speakers}}  
**Template:** {{template_name}}

---

## Summary

{{llm:summarize}}

> Summarize the following meeting transcript in 3-5 sentences. Focus on the main purpose of the meeting and overall outcome.
> {{/llm}}

## Action Items

{{llm:action_items}}

> Extract all action items from the transcript. For each, identify: the action, the person responsible (if mentioned), and any deadline. Format as a markdown checklist: - [ ] [Action] — [Owner] by [Deadline].
> {{/llm}}

## Decisions Made

{{llm:decisions}}

> List all decisions made during the meeting. For each decision, note the decision and brief context. Format as a bullet list.
> {{/llm}}

## Key Discussion Points

{{llm:key_points}}

> Identify the 3-5 most important discussion points from the transcript. Be concise.
> {{/llm}}

## Open Questions

{{llm:open_questions}}

> List any questions raised during the meeting that were not fully resolved.
> {{/llm}}

---

## Full Transcript

{{transcript}}

---

_Audio:_ [[{{audio_path}}]]
```

### 6.1 Template Variables

| Variable                   | Description                                            |
| -------------------------- | ------------------------------------------------------ |
| `{{title}}`                | User-provided or auto-generated session title          |
| `{{date}}`                 | Recording date (ISO 8601)                              |
| `{{duration}}`             | Recording duration (human-readable, e.g., "42 min")    |
| `{{speakers}}`             | Comma-separated speaker labels                         |
| `{{template_name}}`        | Name of the template used                              |
| `{{transcript}}`           | Full timestamped, speaker-labeled transcript           |
| `{{audio_path}}`           | Vault-relative path to the audio file                  |
| `{{llm:key}} ... {{/llm}}` | LLM prompt block; content is the prompt sent to Ollama |

---

## 7. Audio Pipeline

```
Microphone Input
      │
      ▼
MediaRecorder API (browser)
  - Format: audio/webm;codecs=opus (converted to WAV for Whisper)
  - Sample rate: 16000 Hz
  - Channels: 1 (mono)
      │
      ▼
AudioContext (Web Audio API)
  - Real-time level monitoring for UI feedback
      │
      ▼
On Stop: Convert to WAV blob
      │
      ├──► Save WAV to vault audio folder (via Obsidian vault API)
      │
      └──► POST to /transcribe on Python backend
```

---

## 8. Processing Pipeline

```
POST /transcribe (WAV audio)
      │
      ▼
Whisper transcription
  - Output: segments with [start, end, text]
      │
      ▼
Pyannote diarization
  - Output: speaker turns with [start, end, speaker_id]
      │
      ▼
Merge segments + speaker turns
  - Align by timestamp overlap
  - Output: unified segments [{start, end, speaker, text}]
      │
      ▼
Return JSON to plugin
      │
      ▼
Plugin: template selection
      │
      ▼
For each {{llm:...}} block in template:
  - Assemble prompt (block instructions + transcript)
  - POST to Ollama /api/generate
  - Collect response
      │
      ▼
Render final markdown note
  - Substitute all variables and LLM outputs
      │
      ▼
Write note to Obsidian vault
  - Open note in editor
```

---

## 9. Error Handling

| Scenario                     | Behavior                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Backend not running          | Show notice: "Transcription backend is not running. Start it before recording." |
| Microphone access denied     | Show notice with OS permission instructions                                     |
| Whisper model not downloaded | Show notice with download instructions                                          |
| Pyannote token missing       | Show notice with HuggingFace token setup instructions                           |
| Ollama not running           | Skip LLM blocks, insert placeholder text in note, show notice                   |
| Ollama model not pulled      | Show notice with `ollama pull <model>` instruction                              |
| Recording too short (< 5s)   | Show warning, still attempt transcription                                       |
| Note write failure           | Log error, offer to copy transcript to clipboard                                |

---

## 10. Security & Privacy

- No audio, transcript, or metadata is transmitted outside localhost
- Backend binds to 127.0.0.1 only (not 0.0.0.0)
- HuggingFace token stored in backend `.env` file, never exposed to the plugin
- Plugin never logs audio data or transcript content to Obsidian console in production builds
- Audio files stored in vault are governed by vault-level access controls

---

## 11. Development Environment

### Plugin

```bash
git clone <repo>
cd obsidian-transcribe-plugin
npm install
npm run dev        # watch mode with esbuild
```

### Backend

```bash
cd backend
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt   # or: uv sync
uvicorn main:app --host 127.0.0.1 --port 8765 --reload
```

### Environment Variables (backend `.env`)

```
HUGGINGFACE_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
WHISPER_CACHE_DIR=./models/whisper
PYANNOTE_CACHE_DIR=./models/pyannote
```
