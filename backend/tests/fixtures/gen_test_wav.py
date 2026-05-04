"""Generate a short synthetic WAV fixture for E2E tests.

Run once to produce test_audio.wav in this directory:
    python gen_test_wav.py

The fixture is a 10-second, 16 kHz, 16-bit mono WAV containing a 440 Hz
sine wave — just enough for Whisper to receive valid audio and return a
response (it will likely produce no transcript or noise, but the pipeline
is exercised end-to-end).
"""
from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 16_000
DURATION_SECONDS = 10
FREQUENCY_HZ = 440
OUTPUT_PATH = Path(__file__).parent / "test_audio.wav"


def generate_sine_wav(path: Path) -> None:
    num_samples = SAMPLE_RATE * DURATION_SECONDS
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(SAMPLE_RATE)
        for i in range(num_samples):
            sample = int(32767 * math.sin(2 * math.pi * FREQUENCY_HZ * i / SAMPLE_RATE))
            wf.writeframes(struct.pack("<h", sample))
    print(f"Written: {path}  ({num_samples} samples, {DURATION_SECONDS}s)")


if __name__ == "__main__":
    generate_sine_wav(OUTPUT_PATH)
