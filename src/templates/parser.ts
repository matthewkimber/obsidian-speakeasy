import type { ParsedTemplate, TemplateVars } from "../types";

const LLM_BLOCK_RE = /\{\{llm:[^}]+\}\}[\s\S]*?\{\{\/llm\}\}/g;
const LLM_PENDING = "_LLM annotation pending._";

export function parseTemplate(content: string): ParsedTemplate {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) throw new Error("Invalid template: missing or malformed frontmatter");

	const frontmatterText = match[1] ?? "";
	const bodyRaw = match[2] ?? "";

	const meta: Record<string, string> = {};
	for (const line of frontmatterText.split("\n")) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		const key = kv?.[1];
		const val = kv?.[2];
		if (key !== undefined && val !== undefined) meta[key] = val.trim();
	}

	const name = meta["name"] ?? "Unnamed";
	return {
		name,
		description: meta["description"] ?? "",
		version: meta["version"] ?? "1.0",
		slug: toSlug(name),
		body: bodyRaw.trimStart(),
	};
}

export function renderTemplate(template: ParsedTemplate, vars: TemplateVars): string {
	let output = template.body.replace(LLM_BLOCK_RE, LLM_PENDING);
	for (const [key, value] of Object.entries(vars) as [string, string][]) {
		output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
	}
	return output;
}

function toSlug(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
