from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Any

import whisper


class WhisperModelNotFoundError(Exception):
    def __init__(self, model_name: str) -> None:
        super().__init__(f"Whisper model '{model_name}' is not downloaded.")
        self.model_name = model_name


class AudioTooShortError(Exception):
    def __init__(self) -> None:
        super().__init__("Audio must be at least 1 second long.")


def run_whisper(audio_bytes: bytes, model_name: str) -> dict[str, Any]:
    """
    Transcribe audio bytes using Whisper.

    Returns a dict with:
        duration: float
        segments: list[dict] with keys start, end, text
    """
    try:
        model = whisper.load_model(model_name)
    except Exception as exc:
        # Whisper raises RuntimeError or similar when the model file is missing
        raise WhisperModelNotFoundError(model_name) from exc

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        result = model.transcribe(tmp_path, word_timestamps=False)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    duration: float = result.get("duration", 0.0)

    if duration < 1.0:
        raise AudioTooShortError()

    segments = [
        {"start": seg["start"], "end": seg["end"], "text": seg["text"]}
        for seg in result.get("segments", [])
    ]

    return {"duration": duration, "segments": segments}
