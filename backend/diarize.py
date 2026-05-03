from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any


class PyannoteTokenMissingError(Exception):
    def __init__(self) -> None:
        super().__init__(
            "HUGGINGFACE_TOKEN is not set. "
            "See the backend README for setup instructions."
        )


def run_pyannote(
    audio_bytes: bytes,
    num_speakers: int | None = None,
) -> list[dict[str, Any]]:
    """
    Run Pyannote speaker diarization on audio bytes.

    Returns a list of speaker turns:
        [{"start": float, "end": float, "speaker": "Speaker 1"}, ...]

    Speaker labels are normalised to "Speaker 1", "Speaker 2", etc. in the
    order they first appear in the audio.

    Raises PyannoteTokenMissingError if HUGGINGFACE_TOKEN is not set.
    """
    token = os.environ.get("HUGGINGFACE_TOKEN")
    if not token:
        raise PyannoteTokenMissingError()

    # Lazy import — pyannote.audio is heavy and only needed at call time
    from pyannote.audio import Pipeline  # type: ignore[import-untyped]

    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        use_auth_token=token,
    )

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        kwargs: dict[str, Any] = {}
        if num_speakers and num_speakers > 0:
            kwargs["num_speakers"] = num_speakers
        diarization = pipeline(tmp_path, **kwargs)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    speaker_map: dict[str, str] = {}
    counter = 1
    turns: list[dict[str, Any]] = []

    for segment, _, raw_speaker in diarization.itertracks(yield_label=True):
        if raw_speaker not in speaker_map:
            speaker_map[raw_speaker] = f"Speaker {counter}"
            counter += 1
        turns.append(
            {
                "start": segment.start,
                "end": segment.end,
                "speaker": speaker_map[raw_speaker],
            }
        )

    return turns
