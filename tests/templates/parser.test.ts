import { describe, it, expect } from "vitest";
import { parseTemplate, renderTemplate } from "../../src/templates/parser";
import type { TemplateVars } from "../../src/types";

// ---------------------------------------------------------------------------
// parseTemplate
// ---------------------------------------------------------------------------

const MINIMAL_TEMPLATE = `---
name: Test Template
description: A test template
version: 1.0
---

# {{title}}

{{transcript}}
`;

describe("parseTemplate", () => {
	it("extracts name from frontmatter", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(t.name).toBe("Test Template");
	});

	it("extracts description from frontmatter", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(t.description).toBe("A test template");
	});

	it("extracts version from frontmatter", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(t.version).toBe("1.0");
	});

	it("generates a slug from the name", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(t.slug).toBe("test-template");
	});

	it("separates the body from the frontmatter", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(t.body).toContain("# {{title}}");
		expect(t.body).not.toContain("name: Test Template");
	});

	it("strips leading whitespace from the body", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(t.body).not.toMatch(/^\s+/);
	});

	it("produces slug with hyphens for spaces", () => {
		const t = parseTemplate(`---\nname: One-on-One\ndescription: x\nversion: 1.0\n---\nbody`);
		expect(t.slug).toBe("one-on-one");
	});

	it("produces slug with hyphens for special characters", () => {
		const t = parseTemplate(`---\nname: Research / Interview\ndescription: x\nversion: 1.0\n---\nbody`);
		expect(t.slug).toBe("research-interview");
	});

	it("throws on missing frontmatter", () => {
		expect(() => parseTemplate("No frontmatter here")).toThrow();
	});
});

// ---------------------------------------------------------------------------
// renderTemplate
// ---------------------------------------------------------------------------

const SAMPLE_VARS: TemplateVars = {
	title: "Q2 Planning",
	date: "2026-05-03",
	duration: "45m",
	speakers: "Speaker 1, Speaker 2",
	template_name: "Meeting Notes",
	transcript: "[00:00] Hello world",
	audio_path: "Recordings/rec.wav",
};

describe("renderTemplate", () => {
	it("substitutes {{title}}", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(renderTemplate(t, SAMPLE_VARS)).toContain("# Q2 Planning");
	});

	it("substitutes {{transcript}}", () => {
		const t = parseTemplate(MINIMAL_TEMPLATE);
		expect(renderTemplate(t, SAMPLE_VARS)).toContain("[00:00] Hello world");
	});

	it("substitutes all variables in a single pass", () => {
		const raw = `---\nname: T\ndescription: d\nversion: 1.0\n---\n{{date}} {{duration}} {{speakers}}`;
		const t = parseTemplate(raw);
		const out = renderTemplate(t, SAMPLE_VARS);
		expect(out).toContain("2026-05-03");
		expect(out).toContain("45m");
		expect(out).toContain("Speaker 1, Speaker 2");
	});

	it("leaves unrecognised placeholders untouched", () => {
		const raw = `---\nname: T\ndescription: d\nversion: 1.0\n---\n{{unknown_var}}`;
		const t = parseTemplate(raw);
		expect(renderTemplate(t, SAMPLE_VARS)).toContain("{{unknown_var}}");
	});

	it("strips a single-line LLM block", () => {
		const raw = `---\nname: T\ndescription: d\nversion: 1.0\n---\n{{llm:summary}}\nSummarise this.\n{{/llm}}`;
		const t = parseTemplate(raw);
		const out = renderTemplate(t, SAMPLE_VARS);
		expect(out).not.toContain("{{llm:summary}}");
		expect(out).not.toContain("Summarise this.");
		expect(out).not.toContain("{{/llm}}");
	});

	it("replaces LLM block with pending placeholder", () => {
		const raw = `---\nname: T\ndescription: d\nversion: 1.0\n---\n{{llm:summary}}\nSummarise this.\n{{/llm}}`;
		const t = parseTemplate(raw);
		const out = renderTemplate(t, SAMPLE_VARS);
		expect(out).toContain("_LLM annotation pending._");
	});

	it("handles multiple LLM blocks independently", () => {
		const raw = [
			"---",
			"name: T",
			"description: d",
			"version: 1.0",
			"---",
			"{{llm:summary}}",
			"Summarise.",
			"{{/llm}}",
			"",
			"{{llm:actions}}",
			"List action items.",
			"{{/llm}}",
		].join("\n");
		const t = parseTemplate(raw);
		const out = renderTemplate(t, SAMPLE_VARS);
		expect(out.match(/_LLM annotation pending\._/g)?.length).toBe(2);
	});

	it("handles multiline LLM block content", () => {
		const raw = [
			"---",
			"name: T",
			"description: d",
			"version: 1.0",
			"---",
			"## Summary",
			"{{llm:summary}}",
			"Line one of prompt.",
			"Line two of prompt.",
			"Line three.",
			"{{/llm}}",
			"## Transcript",
			"{{transcript}}",
		].join("\n");
		const t = parseTemplate(raw);
		const out = renderTemplate(t, SAMPLE_VARS);
		expect(out).toContain("## Summary");
		expect(out).toContain("_LLM annotation pending._");
		expect(out).toContain("## Transcript");
		expect(out).toContain("[00:00] Hello world");
		expect(out).not.toContain("Line one of prompt.");
	});

	it("substitutes {{audio_path}}", () => {
		const raw = `---\nname: T\ndescription: d\nversion: 1.0\n---\n[[{{audio_path}}]]`;
		const t = parseTemplate(raw);
		expect(renderTemplate(t, SAMPLE_VARS)).toContain("[[Recordings/rec.wav]]");
	});
});
