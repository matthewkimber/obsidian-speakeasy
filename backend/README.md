# Speakeasy backend

Local FastAPI server that handles Whisper transcription and Pyannote speaker diarisation for the Speakeasy Obsidian plugin.

## Requirements

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip
- A Hugging Face account with access to the [pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1) model

## Setup

```bash
# 1. Create and activate a virtual environment
uv venv
source .venv/bin/activate   # macOS / Linux
# .venv\Scripts\activate    # Windows

# 2. Install dependencies
uv pip install -r requirements.txt

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env — set HUGGINGFACE_TOKEN to your HF token
```

## Running

```bash
uvicorn main:app --host 127.0.0.1 --port 8765 --reload
```

The backend will be available at `http://localhost:8765`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns status and list of downloaded Whisper models |
| GET | `/models` | Lists downloaded Whisper model names |
| POST | `/transcribe` | Accepts a WAV file and returns a timestamped, speaker-labelled transcript |

### POST /transcribe

**Form fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `audio` | file | required | WAV audio file (16kHz mono recommended) |
| `whisper_model` | string | `base` | Whisper model size: `tiny`, `base`, `small`, `medium`, `large` |
| `num_speakers` | int | `null` | Hint for number of speakers (optional) |

**Response:**

```json
{
  "duration_seconds": 125.4,
  "segments": [
    { "start": 0.0, "end": 3.2, "speaker": "Speaker 1", "text": "Hello there." },
    { "start": 3.5, "end": 7.1, "speaker": "Speaker 2", "text": "Good morning." }
  ]
}
```

## Privacy

All processing is local. No audio or transcript data is sent to any external service.
The only outbound network call is the initial model download from Hugging Face (one-time, gated by your HF token).
