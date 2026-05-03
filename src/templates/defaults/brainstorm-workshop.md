---
name: Brainstorm / Workshop
description: Ideation sessions, creative workshops, and exploratory discussions
version: 1.0
---

# {{title}}

**Date:** {{date}}
**Duration:** {{duration}}
**Participants:** {{speakers}}
**Template:** {{template_name}}

---

## Ideas Generated

{{llm:ideas}}
List all distinct ideas raised during this session. Include even rough or partial ideas — capture the full creative output. Format as a bullet list.
{{/llm}}

## Emerging Themes

{{llm:themes}}
Group the ideas above into 2–5 thematic clusters. Name each cluster and list the related ideas beneath it.
{{/llm}}

## Next Steps

{{llm:next_steps}}
Identify any concrete next steps, experiments, or follow-up actions agreed upon. Format as a markdown checklist: - [ ] [Action] — [Owner].
{{/llm}}

## Concepts to Explore

{{llm:concepts}}
List any concepts, frameworks, or areas the group identified as worth researching or revisiting in a future session.
{{/llm}}

---

## Full Transcript

{{transcript}}

---

_Audio:_ [[{{audio_path}}]]
