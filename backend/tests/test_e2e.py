"""End-to-end tests — require a live backend and a real Whisper install.

Run with:
    pytest -m e2e

These tests are excluded from standard CI. They exercise the full pipeline:
audio upload → Whisper transcription → response parsing.

The synthetic test fixture (tests/fixtures/test_audio.wav) is a 10-second
440 Hz sine wave. Whisper will not produce meaningful transcript text from
it, but the pipeline must return a valid response without errors.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
import pytest

BASE_URL = os.environ.get("SPEAKEASY_BACKEND_URL", "http://127.0.0.1:8765")
FIXTURE_WAV = Path(__file__).parent / "fixtures" / "test_audio.wav"


@pytest.fixture(scope="module")
def client() -> httpx.Client:
    return httpx.Client(base_url=BASE_URL, timeout=120)


@pytest.mark.e2e
def test_health_returns_ok(client: httpx.Client) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["models"], list)


@pytest.mark.e2e
def test_transcribe_returns_valid_response(client: httpx.Client) -> None:
    assert FIXTURE_WAV.exists(), f"Test fixture missing — run: python3 {FIXTURE_WAV.parent}/gen_test_wav.py"
    with FIXTURE_WAV.open("rb") as f:
        response = client.post(
            "/transcribe",
            data={"whisper_model": "tiny"},
            files={"audio": ("test_audio.wav", f, "audio/wav")},
        )
    assert response.status_code == 200, f"Unexpected status: {response.status_code} — {response.text}"
    body = response.json()
    assert "duration_seconds" in body
    assert isinstance(body["duration_seconds"], float)
    assert body["duration_seconds"] > 0
    assert "segments" in body
    assert isinstance(body["segments"], list)


@pytest.mark.e2e
def test_transcribe_segment_shape(client: httpx.Client) -> None:
    assert FIXTURE_WAV.exists(), f"Test fixture missing — run: python3 {FIXTURE_WAV.parent}/gen_test_wav.py"
    with FIXTURE_WAV.open("rb") as f:
        response = client.post(
            "/transcribe",
            data={"whisper_model": "tiny"},
            files={"audio": ("test_audio.wav", f, "audio/wav")},
        )
    body = response.json()
    for seg in body["segments"]:
        assert "start" in seg
        assert "end" in seg
        assert "speaker" in seg
        assert "text" in seg
        assert isinstance(seg["start"], float)
        assert isinstance(seg["end"], float)
        assert seg["end"] >= seg["start"]


@pytest.mark.e2e
def test_transcribe_unknown_model_returns_404(client: httpx.Client) -> None:
    assert FIXTURE_WAV.exists(), f"Test fixture missing — run: python3 {FIXTURE_WAV.parent}/gen_test_wav.py"
    with FIXTURE_WAV.open("rb") as f:
        response = client.post(
            "/transcribe",
            data={"whisper_model": "nonexistent-model-xyz"},
            files={"audio": ("test_audio.wav", f, "audio/wav")},
        )
    assert response.status_code == 404
    assert response.json()["detail"] == "whisper_model_not_found"
