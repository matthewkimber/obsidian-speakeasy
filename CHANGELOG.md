# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-03

### Added

- **Audio recording** — one-click microphone recording via ribbon icon and command palette
- **Whisper transcription** — sends WAV audio to a local Whisper backend for offline transcription
- **Speaker diarization** — labels speaker turns when the backend identifies multiple speakers
- **Template system** — 7 built-in templates (Meeting Notes, One-on-One, Research / Interview, Brainstorm / Workshop, Decision Log, Learning / Insight Capture, Stakeholder Communication); custom vault templates supported
- **Ollama annotation** — optional LLM post-processing of `{{llm:…}}` blocks in templates using a locally-running Ollama model
- **Template selection modal** — choose template, set a note title, and optionally skip Ollama before each recording
- **Settings** — configure backend URL, Whisper model, audio/note output folders, template folder, default template, speaker count, Ollama toggle and model, microphone device
- **Status bar indicator** — shows recording and processing state
- **Backend autostart** — documented macOS launchd, Linux systemd, and Windows Task Scheduler setup in README
- **Onboarding notice** — first-run message pointing users to Settings
- **Safe unload** — microphone released automatically when plugin is disabled while recording
