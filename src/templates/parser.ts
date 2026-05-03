import type { ParsedTemplate, TemplateVars } from "../types";

const LLM_BLOCK_RE = /\{\{llm:([^}]+)\}\}([\s\S]*?)\{\{\/llm\}\}/g;
const LLM_PENDING = "_LLM annotation pending._";

export interface LlmBlock {
	key: string;
	prompt: string;
}

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

export function extractLlmBlocks(body: string): LlmBlock[] {
	const blocks: LlmBlock[] = [];
	let match: RegExpExecArray | null;
	const re = new RegExp(LLM_BLOCK_RE.source, "g");
	while ((match = re.exec(body)) !== null) {
		const key = match[1]?.trim() ?? "";
		const prompt = match[2]?.trim() ?? "";
		if (key) blocks.push({ key, prompt });
	}
	return blocks;
}

export function renderTemplate(
	template: ParsedTemplate,
	vars: TemplateVars,
	annotations?: Map<string, string>,
): string {
	let output = template.body;

	if (annotations) {
		for (const block of extractLlmBlocks(template.body)) {
			const replacement = annotations.get(block.key) ?? LLM_PENDING;
			output = output.replace(
				new RegExp(
					`\\{\\{llm:${escapeRegex(block.key)}\\}\\}[\\s\\S]*?\\{\\{/llm\\}\\}`,
				),
				replacement,
			);
		}
	} else {
		output = output.replace(new RegExp(LLM_BLOCK_RE.source, "g"), LLM_PENDING);
	}

	for (const [key, value] of Object.entries(vars) as [string, string][]) {
		output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
	}
	return output;
}

function toSlug(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
