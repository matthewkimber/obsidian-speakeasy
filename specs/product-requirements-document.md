# Product Requirements Document

## Obsidian Transcription & Annotation Plugin

**Version:** 1.0  
**Status:** Draft  
**Author:** Matteo (via Claude)  
**Last Updated:** 2026-05-03

---

## 1. Overview

### 1.1 Vision

A native Obsidian plugin that records conversations via microphone, transcribes speech locally, identifies speakers, and produces richly annotated, LLM-enriched notes—all without sending data to external cloud services.

### 1.2 Problem Statement

Practitioners who conduct meetings, interviews, and brainstorming sessions lack a seamless, privacy-preserving way to capture, transcribe, and structure spoken conversations directly within their knowledge management workflow. Existing tools either require cloud processing, live outside the note-taking environment, or produce raw transcripts without intelligent structuring.

### 1.3 Target Users

| Persona                  | Description                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| Knowledge Worker         | Captures meetings and 1:1s, needs action items and decisions surfaced     |
| Researcher / Interviewer | Records interviews, needs insights and quotes organized                   |
| Engineering Leader       | Documents standups and design discussions, needs decisions and follow-ups |
| Entrepreneur             | Captures stakeholder calls, needs commitments and open questions tracked  |

### 1.4 Success Metrics

- Time from recording stop to annotated note: < 90 seconds for a 30-minute session
- Speaker identification accuracy: ≥ 85% on clean mic audio
- Transcription word error rate: ≤ 10% on clear speech
- User adoption: Templates used in > 80% of sessions
- Zero data leaves the local machine during processing

---

## 2. Scope

### 2.1 In Scope (MVP)

- Microphone recording initiated and stopped within Obsidian
- Local speech-to-text transcription via Whisper
- Speaker diarization via Pyannote
- Timestamped, speaker-labeled transcript output in Obsidian notes
- Configurable Ollama endpoint for LLM-powered annotation
- Bundled note templates with LLM prompt orchestration
- User-defined custom templates stored in vault or plugin settings

### 2.2 Out of Scope (MVP)

- System audio capture
- Cloud-based transcription APIs
- Real-time live transcription display during recording
- Multi-device sync or shared vaults
- Mobile support (Obsidian mobile)

---

## 3. Functional Requirements

### 3.1 Audio Recording

| ID    | Requirement                                                                             | Priority |
| ----- | --------------------------------------------------------------------------------------- | -------- |
| FR-01 | Plugin provides a Record button accessible from the Obsidian ribbon and command palette | Must     |
| FR-02 | Recording captures input from the system's default or user-selected microphone          | Must     |
| FR-03 | A Stop button ends recording and triggers the processing pipeline                       | Must     |
| FR-04 | Recording status is visible in the Obsidian UI (e.g., status bar indicator or modal)    | Must     |
| FR-05 | Raw audio file (WAV or MP3) is saved to a user-configured vault folder                  | Must     |
| FR-06 | User can select microphone device from plugin settings                                  | Should   |

### 3.2 Transcription

| ID    | Requirement                                                                            | Priority |
| ----- | -------------------------------------------------------------------------------------- | -------- |
| FR-07 | Transcription is performed locally via Whisper running on the user's machine           | Must     |
| FR-08 | The plugin communicates with a local Python backend service over HTTP                  | Must     |
| FR-09 | Whisper model selection (tiny, base, small, medium, large) is configurable in settings | Should   |
| FR-10 | Transcript includes word-level or segment-level timestamps                             | Must     |

### 3.3 Speaker Diarization

| ID    | Requirement                                                                               | Priority |
| ----- | ----------------------------------------------------------------------------------------- | -------- |
| FR-11 | Speaker diarization is performed locally via Pyannote                                     | Must     |
| FR-12 | Each transcript segment is labeled with a speaker identifier (Speaker 1, Speaker 2, etc.) | Must     |
| FR-13 | Users can rename speaker identifiers in the generated note                                | Should   |
| FR-14 | Diarization runs after transcription and merges results before note generation            | Must     |

### 3.4 LLM Annotation via Ollama

| ID    | Requirement                                                                                        | Priority |
| ----- | -------------------------------------------------------------------------------------------------- | -------- |
| FR-15 | Plugin settings include a configurable Ollama base URL (default: http://localhost:11434)           | Must     |
| FR-16 | LLM annotation is optional and can be disabled per session or globally                             | Must     |
| FR-17 | The selected note template defines which LLM prompts are executed against the transcript           | Must     |
| FR-18 | Multiple LLM calls per template are supported (e.g., separate calls for actions, decisions, risks) | Must     |
| FR-19 | The Ollama model used is configurable in settings (e.g., llama3, mistral)                          | Should   |

### 3.5 Note Templates

| ID    | Requirement                                                                             | Priority |
| ----- | --------------------------------------------------------------------------------------- | -------- |
| FR-20 | Plugin ships with built-in default templates (see Section 4)                            | Must     |
| FR-21 | Users can create custom templates stored as markdown files in a designated vault folder | Must     |
| FR-22 | Users can create custom templates via the plugin settings UI                            | Should   |
| FR-23 | Templates support variable placeholders for transcript data (speaker, timestamp, text)  | Must     |
| FR-24 | Templates include embedded LLM prompt blocks that instruct Ollama on what to extract    | Must     |
| FR-25 | Template selection is available before or after recording                               | Must     |
| FR-26 | Default template folder path is configurable                                            | Should   |

### 3.6 Note Output

| ID    | Requirement                                                                            | Priority |
| ----- | -------------------------------------------------------------------------------------- | -------- |
| FR-27 | Generated note is created in the active vault, in a user-configured folder             | Must     |
| FR-28 | Note filename is derived from date, time, and optional user-provided title             | Must     |
| FR-29 | Note includes YAML frontmatter with metadata (date, duration, speakers, template used) | Must     |
| FR-30 | Note body follows the selected template structure                                      | Must     |
| FR-31 | Raw audio file path is embedded as a link in the note                                  | Must     |

---

## 4. Default Note Templates

### 4.1 Meeting Notes

**Purpose:** General team meetings  
**LLM Extractions:** Action items (owner + deadline), decisions made, key discussion points, open questions  
**Structure:** Metadata → Summary → Action Items → Decisions → Key Points → Full Transcript

### 4.2 One-on-One

**Purpose:** Manager/direct report or peer 1:1 sessions  
**LLM Extractions:** Feedback exchanged, goals discussed, blockers surfaced, follow-up commitments  
**Structure:** Metadata → Themes → Feedback → Goals → Follow-ups → Full Transcript

### 4.3 Research / Interview

**Purpose:** User research, expert interviews  
**LLM Extractions:** Key insights, notable quotes, recurring themes, sources or references mentioned  
**Structure:** Metadata → Insights → Themes → Quotes → Full Transcript

### 4.4 Brainstorm / Workshop

**Purpose:** Ideation and creative sessions  
**LLM Extractions:** Ideas generated, themes emerged, next steps, concepts to explore  
**Structure:** Metadata → Ideas → Themes → Next Steps → Full Transcript

### 4.5 Decision Log

**Purpose:** Any session where decisions are being made  
**LLM Extractions:** Decision title, context, alternatives considered, outcome, rationale, decision owner  
**Structure:** Metadata → Decision Registry (tabular) → Supporting Discussion → Full Transcript  
**Unique Value:** Preserves the "why" behind decisions, not just what was decided

### 4.6 Learning / Insight Capture

**Purpose:** Mentorship, coaching, expert conversations  
**LLM Extractions:** Lessons learned, mental models introduced, frameworks discussed, recommended resources  
**Structure:** Metadata → Key Lessons → Mental Models → Frameworks → Resources → Full Transcript  
**Unique Value:** Oriented toward personal knowledge growth, not task management

### 4.7 Stakeholder Communication

**Purpose:** Client calls, executive briefings, external partner meetings  
**LLM Extractions:** Concerns raised, commitments made, open questions, risk flags, follow-up owners  
**Structure:** Metadata → Commitments → Open Questions → Concerns → Risk Flags → Full Transcript  
**Unique Value:** Accountability-focused; designed for generating follow-up emails or status updates

---

## 5. Non-Functional Requirements

| ID     | Requirement                                                                   | Target       |
| ------ | ----------------------------------------------------------------------------- | ------------ |
| NFR-01 | All processing is fully local; no audio or transcript data leaves the machine | Strict       |
| NFR-02 | Obsidian UI remains responsive during processing (no blocking)                | Must         |
| NFR-03 | Total processing time (transcription + diarization + LLM) for 30-min session  | < 90 seconds |
| NFR-04 | Plugin works on Windows, macOS, and Linux desktop                             | Must         |
| NFR-05 | Python backend startup time                                                   | < 5 seconds  |
| NFR-06 | Plugin does not require Obsidian Sync or any cloud vault features             | Must         |
| NFR-07 | Audio captured at minimum 16kHz, 16-bit mono (Whisper minimum)                | Must         |
| NFR-08 | Plugin settings persist across Obsidian restarts                              | Must         |
| NFR-09 | Plugin gracefully handles backend unavailability with clear error messaging   | Must         |
| NFR-10 | Plugin is compatible with Obsidian API v1.0+                                  | Must         |

---

## 6. Constraints & Assumptions

- Users are responsible for installing and running the Python backend (Whisper + Pyannote)
- Ollama must be separately installed and running for LLM features
- Pyannote requires a HuggingFace token for model download (one-time setup)
- Microphone access requires OS-level permissions granted by the user
- Plugin targets Obsidian desktop only (Electron environment)
