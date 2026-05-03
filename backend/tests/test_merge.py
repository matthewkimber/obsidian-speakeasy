"""Unit tests for the Whisper + Pyannote segment merger."""
from __future__ import annotations

import pytest

from merge import merge_segments


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def seg(start: float, end: float, text: str) -> dict:
    return {"start": start, "end": end, "text": text}


def turn(start: float, end: float, speaker: str) -> dict:
    return {"start": start, "end": end, "speaker": speaker}


# ---------------------------------------------------------------------------
# Empty / trivial cases
# ---------------------------------------------------------------------------

def test_empty_segments_returns_empty() -> None:
    assert merge_segments([], [turn(0, 5, "Speaker 1")]) == []


def test_empty_turns_returns_segments_with_blank_speaker() -> None:
    result = merge_segments([seg(0, 5, "Hello")], [])
    assert len(result) == 1
    assert result[0]["speaker"] == ""
    assert result[0]["text"] == "Hello"


def test_both_empty_returns_empty() -> None:
    assert merge_segments([], []) == []


# ---------------------------------------------------------------------------
# Single speaker
# ---------------------------------------------------------------------------

def test_single_turn_assigns_all_segments_same_speaker() -> None:
    segs = [seg(0, 3, "First"), seg(3, 6, "Second"), seg(6, 9, "Third")]
    turns = [turn(0, 10, "Speaker 1")]
    result = merge_segments(segs, turns)
    assert all(r["speaker"] == "Speaker 1" for r in result)


# ---------------------------------------------------------------------------
# Two-speaker overlap assignment
# ---------------------------------------------------------------------------

def test_assigns_speaker_by_maximum_overlap() -> None:
    # seg [0-5] overlaps Speaker 1 [0-6] by 5s, Speaker 2 [4-10] by 1s → Speaker 1
    # seg [6-11] overlaps Speaker 1 [0-6] by 0s, Speaker 2 [4-10] by 4s → Speaker 2
    segs = [seg(0, 5, "A"), seg(6, 11, "B")]
    turns = [turn(0, 6, "Speaker 1"), turn(4, 10, "Speaker 2")]
    result = merge_segments(segs, turns)
    assert result[0]["speaker"] == "Speaker 1"
    assert result[1]["speaker"] == "Speaker 2"


def test_segment_spanning_two_turns_picks_greater_overlap() -> None:
    # seg [4-9] overlaps Speaker 1 [0-6] by 2s, Speaker 2 [6-12] by 3s → Speaker 2
    segs = [seg(4, 9, "Spans both")]
    turns = [turn(0, 6, "Speaker 1"), turn(6, 12, "Speaker 2")]
    result = merge_segments(segs, turns)
    assert result[0]["speaker"] == "Speaker 2"


# ---------------------------------------------------------------------------
# Gap handling (segment between turns)
# ---------------------------------------------------------------------------

def test_segment_in_gap_assigned_to_nearest_turn_by_midpoint() -> None:
    # seg midpoint = 3.5; turn 1 midpoint = 1.0 (dist 2.5), turn 2 midpoint = 8.0 (dist 4.5)
    segs = [seg(3, 4, "In gap")]
    turns = [turn(0, 2, "Speaker 1"), turn(6, 10, "Speaker 2")]
    result = merge_segments(segs, turns)
    assert result[0]["speaker"] == "Speaker 1"


def test_segment_in_gap_closer_to_second_turn() -> None:
    # seg midpoint = 8.5; turn 1 midpoint = 1.0 (dist 7.5), turn 2 midpoint = 10.0 (dist 1.5)
    segs = [seg(8, 9, "Near second")]
    turns = [turn(0, 2, "Speaker 1"), turn(9, 11, "Speaker 2")]
    result = merge_segments(segs, turns)
    assert result[0]["speaker"] == "Speaker 2"


# ---------------------------------------------------------------------------
# Output structure
# ---------------------------------------------------------------------------

def test_output_preserves_start_end_text() -> None:
    segs = [seg(1.5, 3.7, "Hello world")]
    turns = [turn(0, 5, "Speaker 1")]
    result = merge_segments(segs, turns)
    assert result[0] == {"start": 1.5, "end": 3.7, "speaker": "Speaker 1", "text": "Hello world"}


def test_output_length_matches_input() -> None:
    segs = [seg(i, i + 1, f"Word {i}") for i in range(5)]
    turns = [turn(0, 5, "Speaker 1")]
    assert len(merge_segments(segs, turns)) == 5


# ---------------------------------------------------------------------------
# Multi-speaker alternation
# ---------------------------------------------------------------------------

def test_alternating_speakers() -> None:
    segs = [
        seg(0, 4, "Q1"),
        seg(5, 9, "A1"),
        seg(10, 14, "Q2"),
        seg(15, 19, "A2"),
    ]
    turns = [
        turn(0, 4.5, "Speaker 1"),
        turn(4.5, 9.5, "Speaker 2"),
        turn(9.5, 14.5, "Speaker 1"),
        turn(14.5, 20, "Speaker 2"),
    ]
    result = merge_segments(segs, turns)
    assert result[0]["speaker"] == "Speaker 1"
    assert result[1]["speaker"] == "Speaker 2"
    assert result[2]["speaker"] == "Speaker 1"
    assert result[3]["speaker"] == "Speaker 2"
