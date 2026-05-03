---
name: Meeting Notes
description: General team meetings with action items and decisions
version: 1.0
---

# {{title}}

**Date:** {{date}}
**Duration:** {{duration}}
**Speakers:** {{speakers}}
**Template:** {{template_name}}

---

## Summary

{{llm:summary}}
Summarize the following meeting transcript in 3–5 sentences. Focus on the main purpose of the meeting and the overall outcome.
{{/llm}}

## Action Items

{{llm:action_items}}
Extract all action items from the transcript. For each, identify: the action, the person responsible (if mentioned), and any deadline. Format as a markdown checklist: - [ ] [Action] — [Owner] by [Deadline].
{{/llm}}

## Decisions Made

{{llm:decisions}}
List all decisions made during the meeting. For each decision, note the decision and brief context. Format as a bullet list.
{{/llm}}

## Key Discussion Points

{{llm:key_points}}
Identify the 3–5 most important discussion points from the transcript. Be concise.
{{/llm}}

## Open Questions

{{llm:open_questions}}
List any questions raised during the meeting that were not fully resolved.
{{/llm}}

---

## Full Transcript

{{transcript}}

---

_Audio:_ [[{{audio_path}}]]
