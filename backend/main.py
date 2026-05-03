from __future__ import annotations

import os
import glob
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from transcribe import AudioTooShortError, WhisperModelNotFoundError, run_whisper

app = FastAPI(title="Speakeasy backend", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["app://obsidian.md"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TranscriptSegment(BaseModel):
    start: float
    end: float
    speaker: str
    text: str


class TranscribeResponse(BaseModel):
    duration_seconds: float
    segments: list[TranscriptSegment]


class HealthResponse(BaseModel):
    status: str
    models: list[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _available_whisper_models() -> list[str]:
    cache_dir = os.environ.get("WHISPER_CACHE_DIR", str(Path.home() / ".cache" / "whisper"))
    pt_files = glob.glob(str(Path(cache_dir) / "*.pt"))
    return [Path(f).stem for f in pt_files]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", models=_available_whisper_models())


@app.get("/models", response_model=list[str])
async def models() -> list[str]:
    return _available_whisper_models()


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile = File(...),
    whisper_model: str = Form("base"),
    num_speakers: int | None = Form(None),  # noqa: ARG001 — used in Phase 3 (Pyannote)
) -> TranscribeResponse:
    audio_bytes = await audio.read()

    try:
        result = run_whisper(audio_bytes, whisper_model)
    except WhisperModelNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except AudioTooShortError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    segments = [
        TranscriptSegment(
            start=seg["start"],
            end=seg["end"],
            speaker="",  # speaker diarization added in Phase 3
            text=seg["text"],
        )
        for seg in result["segments"]
    ]

    return TranscribeResponse(duration_seconds=result["duration"], segments=segments)
