from __future__ import annotations

from typing import Any


def merge_segments(
    whisper_segments: list[dict[str, Any]],
    pyannote_turns: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Assign a speaker label to each Whisper segment using Pyannote speaker turns.

    For each segment the turn with the greatest temporal overlap wins. When no
    overlap exists (segment falls in a gap between turns) the turn whose midpoint
    is closest to the segment's midpoint is used instead.  If pyannote_turns is
    empty every segment gets an empty speaker string.
    """
    result = []
    for s in whisper_segments:
        speaker = _assign_speaker(s["start"], s["end"], pyannote_turns)
        result.append(
            {
                "start": s["start"],
                "end": s["end"],
                "speaker": speaker,
                "text": s["text"],
            }
        )
    return result


def _assign_speaker(
    seg_start: float,
    seg_end: float,
    turns: list[dict[str, Any]],
) -> str:
    if not turns:
        return ""

    best_speaker = ""
    best_overlap = 0.0

    for t in turns:
        overlap = max(0.0, min(seg_end, t["end"]) - max(seg_start, t["start"]))
        if overlap > best_overlap:
            best_overlap = overlap
            best_speaker = t["speaker"]

    if best_overlap > 0.0:
        return best_speaker

    # No overlap — fall back to nearest turn by midpoint distance
    seg_mid = (seg_start + seg_end) / 2.0
    nearest = min(turns, key=lambda t: abs((t["start"] + t["end"]) / 2.0 - seg_mid))
    return nearest["speaker"]
