import { parseTemplate } from "./parser";
import type { ParsedTemplate } from "../types";

import meetingNotesRaw from "./defaults/meeting-notes.md";
import oneOnOneRaw from "./defaults/one-on-one.md";
import researchInterviewRaw from "./defaults/research-interview.md";
import brainstormWorkshopRaw from "./defaults/brainstorm-workshop.md";
import decisionLogRaw from "./defaults/decision-log.md";
import learningInsightRaw from "./defaults/learning-insight.md";
import stakeholderCommRaw from "./defaults/stakeholder-communication.md";

export const BUILTIN_TEMPLATES: ParsedTemplate[] = [
	meetingNotesRaw,
	oneOnOneRaw,
	researchInterviewRaw,
	brainstormWorkshopRaw,
	decisionLogRaw,
	learningInsightRaw,
	stakeholderCommRaw,
].map((raw) => parseTemplate(raw));
