# Roadmap

## Obsidian Transcription & Annotation Plugin

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-05-03

---

## Guiding Principles

- **Local-first:** Privacy is non-negotiable. No audio or transcript data leaves the machine.
- **Spec-driven:** Each phase is gated by acceptance criteria before the next begins.
- **Lean increments:** Ship working software at each milestone, no big-bang releases.
- **Template extensibility:** The template system is the primary extensibility surface for the LLM layer.

---

## Phase 0 — Foundation (Week 1–2)

**Goal:** Scaffolded, installable plugin and running Python backend with a health check. No audio yet.

### Deliverables

- [ ] Obsidian plugin scaffold (TypeScript, esbuild, manifest.json)
- [ ] Plugin loads without errors in Obsidian developer vault
- [ ] Plugin settings UI stub (all settings fields present, persists to data.json)
- [ ] Python FastAPI backend with `/health` and `/models` endpoints
- [ ] Backend runs via `uvicorn` with `uv`-managed environment
- [ ] Plugin successfully calls `/health` and displays backend status in settings

### Acceptance Criteria

- Plugin appears in Obsidian community plugins (dev mode) with correct name and version
- Settings page renders all configuration fields
- Health check passes end-to-end from plugin to backend

---

## Phase 1 — Audio Recording (Week 2–3)

**Goal:** Users can record microphone audio within Obsidian and save the file to their vault.

### Deliverables

- [ ] Ribbon icon and command palette entry for Start/Stop recording
- [ ] MediaRecorder captures mic audio (16kHz, mono, WAV output)
- [ ] Audio level indicator visible during recording (status bar or modal)
- [ ] WAV file saved to configured vault folder on stop
- [ ] Microphone device selector in settings
- [ ] Graceful handling of microphone permission denial

### Acceptance Criteria

- Recording starts and stops via UI controls
- WAV file appears in vault folder with correct filename format (`YYYY-MM-DD_HH-MM-SS.wav`)
- Audio is audible and clean when played back
- Error notice displays if mic access is denied

---

## Phase 2 — Transcription (Week 3–4)

**Goal:** Plugin sends audio to backend and receives a timestamped transcript.

### Deliverables

- [ ] Plugin POSTs WAV to `/transcribe` after recording stops
- [ ] Backend runs Whisper transcription on received audio
- [ ] Backend returns JSON with segments: `[{start, end, text}]`
- [ ] Plugin displays raw transcript in a new Obsidian note (no template yet)
- [ ] Whisper model selection in plugin settings
- [ ] Processing indicator shown while backend is working

### Acceptance Criteria

- Transcript note created in configured folder on completion
- Timestamps are present and accurate within ±2 seconds
- Processing does not block Obsidian UI
- Error notice shown if backend is unreachable

---

## Phase 3 — Speaker Diarization (Week 4–5)

**Goal:** Transcript segments are labeled by speaker.

### Deliverables

- [ ] Backend runs Pyannote diarization on the same audio
- [ ] Backend merges Whisper segments with Pyannote speaker turns
- [ ] Response includes `speaker` field on each segment
- [ ] Plugin renders transcript grouped by speaker with labels (Speaker 1, Speaker 2, etc.)
- [ ] HuggingFace token documented in backend `.env` setup guide

### Acceptance Criteria

- Each transcript segment includes a speaker label
- Speaker changes are correctly identified in a two-speaker test recording
- Merged output is coherent (no orphaned segments, no gaps > 2 seconds)

---

## Phase 4 — Note Templates (Week 5–6)

**Goal:** Template engine renders structured notes from transcript data.

### Deliverables

- [ ] Template file format defined and parsed (YAML frontmatter + variable placeholders)
- [ ] All 7 default templates created and bundled with the plugin
- [ ] Template selection available in settings (default) and pre/post recording modal
- [ ] Plugin resolves all `{{variable}}` placeholders in template
- [ ] Custom template folder path configurable; plugin reads templates from vault folder
- [ ] Note output matches selected template structure

### Acceptance Criteria

- Each default template produces a valid, well-structured note
- Custom templates stored in vault folder are discoverable in template selector
- All template variables (`{{date}}`, `{{duration}}`, `{{speakers}}`, `{{transcript}}`, etc.) resolve correctly
- Notes created in correct vault folder with correct filename

---

## Phase 5 — LLM Annotation via Ollama (Week 6–8)

**Goal:** Templates drive LLM calls to Ollama; enriched notes include extracted insights.

### Deliverables

- [ ] Ollama base URL and model configurable in plugin settings
- [ ] Plugin parses `{{llm:key}} ... {{/llm}}` blocks from templates
- [ ] For each LLM block, plugin POSTs assembled prompt to Ollama `/api/generate`
- [ ] LLM outputs injected into rendered note at correct positions
- [ ] LLM annotation is skippable (toggle in settings and per-session)
- [ ] Graceful fallback if Ollama is unreachable (placeholder text inserted)
- [ ] Each of the 7 default templates has well-crafted, tested LLM prompts

### Acceptance Criteria

- Meeting Notes template produces: summary, action items, decisions, key points, open questions
- Decision Log template produces: decision registry with rationale and alternatives
- Stakeholder Communication template produces: commitments, open questions, risk flags
- LLM output is coherent and grounded in the actual transcript content
- Processing completes within 90 seconds for a 30-minute recording (on mid-range hardware)

---

## Phase 6 — Polish & Hardening (Week 8–9)

**Goal:** Production-ready plugin suitable for daily use and community release.

### Deliverables

- [ ] Full error handling coverage (all scenarios from TRD Section 9)
- [ ] Settings validation (invalid URLs, unreachable backends surfaced clearly)
- [ ] Onboarding flow for first-time users (backend setup, Ollama setup, HuggingFace token)
- [ ] README with installation instructions for all three platforms (Windows, macOS, Linux)
- [ ] Backend packaging guidance (run as background service / autostart)
- [ ] Unit tests for template parser and segment merger
- [ ] End-to-end test with a reference audio file and expected transcript output
- [ ] Plugin passes Obsidian community plugin submission checklist

### Acceptance Criteria

- All error scenarios produce actionable user-facing messages (no raw stack traces)
- Plugin installs cleanly from a ZIP on all three platforms
- Template parser unit tests pass
- E2E test produces expected output for reference audio file

---

## Post-MVP Backlog (Unscheduled)

These items are deliberately deferred and will be prioritized based on user feedback after Phase 6.

| Item                           | Notes                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| System audio capture           | Platform-specific: Stereo Mix (Windows), BlackHole (macOS), PulseAudio loopback (Linux) |
| Real-time transcript preview   | Stream Whisper output during recording for live feedback                                |
| Speaker renaming UI            | In-note UI to rename Speaker 1 → "Alice" and propagate through transcript               |
| Transcript search              | Full-text search across all transcription notes in the vault                            |
| Re-process existing recordings | Re-run transcription/diarization/LLM on saved audio files                               |
| Mobile support                 | Requires investigation into Obsidian mobile plugin API limitations                      |
| Export to formats              | Export transcript as SRT, VTT, DOCX, or PDF                                             |
| Follow-up email generation     | Stakeholder template generates a draft follow-up email from extracted commitments       |
| Multi-vault support            | Per-vault settings and template libraries                                               |
| Prompt library integration     | Connect to Langfuse or a local prompt library for managed LLM prompts                   |

---

## Decision Log

| Date       | Decision                           | Rationale                                                                           |
| ---------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| 2026-05-03 | Mic-only for MVP, no system audio  | Reduces platform complexity; system audio requires OS-specific virtual devices      |
| 2026-05-03 | Python backend as separate process | Whisper and Pyannote are Python-native; embedding in Electron is impractical        |
| 2026-05-03 | Template-driven LLM orchestration  | Avoids hardcoding analytics logic; makes the plugin extensible without code changes |
| 2026-05-03 | Ollama for LLM, no cloud APIs      | Maintains local-first privacy guarantee                                             |
| 2026-05-03 | Backend on port 8765               | Avoids collision with common dev ports (3000, 8000, 8080)                           |
| 2026-05-03 | uv + ruff for Python tooling       | Consistent with Matteo's established Python tooling standards                       |
