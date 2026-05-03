---
name: Decision Log
description: Captures decisions with rationale, alternatives, and ownership
version: 1.0
---

# {{title}}

**Date:** {{date}}
**Duration:** {{duration}}
**Participants:** {{speakers}}
**Template:** {{template_name}}

---

## Decision Registry

{{llm:decisions}}
Extract every decision made during this conversation. For each decision, produce a row in the following markdown table:

| Decision | Context | Alternatives Considered | Outcome | Owner |
|----------|---------|------------------------|---------|-------|

If a field is not mentioned, write "—".
{{/llm}}

## Supporting Discussion

{{llm:discussion}}
Summarize the key arguments, concerns, and reasoning that shaped the decisions above. Focus on the "why" behind each decision.
{{/llm}}

---

## Full Transcript

{{transcript}}

---

_Audio:_ [[{{audio_path}}]]
