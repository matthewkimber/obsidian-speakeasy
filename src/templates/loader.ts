import { TFile, normalizePath } from "obsidian";
import type SpeakeasyPlugin from "../main";
import type { ParsedTemplate } from "../types";
import { parseTemplate } from "./parser";
import { BUILTIN_TEMPLATES } from "./index";

export const BUILTIN_TEMPLATE_NAMES = BUILTIN_TEMPLATES.map((t) => t.name);

export async function loadAvailableTemplates(plugin: SpeakeasyPlugin): Promise<ParsedTemplate[]> {
	const custom = await loadCustomTemplates(plugin);
	const customNames = new Set(custom.map((t) => t.name));
	return [...BUILTIN_TEMPLATES.filter((t) => !customNames.has(t.name)), ...custom];
}

async function loadCustomTemplates(plugin: SpeakeasyPlugin): Promise<ParsedTemplate[]> {
	const folderPath = normalizePath(plugin.settings.templateFolder);
	const folder = plugin.app.vault.getFolderByPath(folderPath);
	if (!folder) return [];

	const templates: ParsedTemplate[] = [];
	for (const child of folder.children) {
		if (!(child instanceof TFile) || !child.name.endsWith(".md")) continue;
		try {
			const content = await plugin.app.vault.read(child);
			templates.push(parseTemplate(content));
		} catch {
			// skip templates that cannot be parsed
		}
	}
	return templates;
}
