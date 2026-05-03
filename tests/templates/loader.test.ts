import { describe, it, expect, vi } from "vitest";
import { App } from "obsidian";
import { loadAvailableTemplates, BUILTIN_TEMPLATE_NAMES } from "../../src/templates/loader";

function makePlugin(templateFolder = "Templates/Transcription", adapterOverrides = {}) {
	const mockApp = new App();
	// Add list and read to the adapter (not in the base mock)
	Object.assign(mockApp.vault.adapter, {
		list: vi.fn().mockResolvedValue({ files: [], folders: [] }),
		read: vi.fn().mockResolvedValue(""),
		...adapterOverrides,
	});
	return {
		app: mockApp,
		settings: { templateFolder },
	} as unknown as import("../../src/main").default;
}

// ---------------------------------------------------------------------------
// Built-in templates
// ---------------------------------------------------------------------------

describe("BUILTIN_TEMPLATE_NAMES", () => {
	it("contains all 7 expected templates", () => {
		expect(BUILTIN_TEMPLATE_NAMES).toEqual(
			expect.arrayContaining([
				"Meeting Notes",
				"One-on-One",
				"Research / Interview",
				"Brainstorm / Workshop",
				"Decision Log",
				"Learning / Insight Capture",
				"Stakeholder Communication",
			])
		);
		expect(BUILTIN_TEMPLATE_NAMES).toHaveLength(7);
	});
});

// ---------------------------------------------------------------------------
// loadAvailableTemplates
// ---------------------------------------------------------------------------

describe("loadAvailableTemplates", () => {
	it("returns all 7 built-in templates when vault folder is empty", async () => {
		const plugin = makePlugin();
		const templates = await loadAvailableTemplates(plugin);
		expect(templates).toHaveLength(7);
	});

	it("returns templates with valid slugs", async () => {
		const plugin = makePlugin();
		const templates = await loadAvailableTemplates(plugin);
		for (const t of templates) {
			expect(t.slug).toMatch(/^[a-z0-9-]+$/);
		}
	});

	it("returns templates with non-empty bodies", async () => {
		const plugin = makePlugin();
		const templates = await loadAvailableTemplates(plugin);
		for (const t of templates) {
			expect(t.body.trim().length).toBeGreaterThan(0);
		}
	});

	it("returns templates with non-empty descriptions", async () => {
		const plugin = makePlugin();
		const templates = await loadAvailableTemplates(plugin);
		for (const t of templates) {
			expect(t.description.length).toBeGreaterThan(0);
		}
	});

	it("includes a custom template found in the vault folder", async () => {
		const customContent = [
			"---",
			"name: My Custom Template",
			"description: Custom template for testing",
			"version: 1.0",
			"---",
			"# {{title}}",
			"{{transcript}}",
		].join("\n");
		const plugin = makePlugin("Templates/Transcription", {
			exists: vi.fn().mockResolvedValue(true),
			list: vi.fn().mockResolvedValue({ files: ["Templates/Transcription/my-custom.md"], folders: [] }),
			read: vi.fn().mockResolvedValue(customContent),
		});
		const templates = await loadAvailableTemplates(plugin);
		const names = templates.map((t) => t.name);
		expect(names).toContain("My Custom Template");
	});

	it("custom template overrides built-in with same name", async () => {
		const customMeetingNotes = [
			"---",
			"name: Meeting Notes",
			"description: My custom meeting notes",
			"version: 2.0",
			"---",
			"Custom body",
		].join("\n");
		const plugin = makePlugin("Templates/Transcription", {
			exists: vi.fn().mockResolvedValue(true),
			list: vi.fn().mockResolvedValue({ files: ["Templates/Transcription/meeting-notes.md"], folders: [] }),
			read: vi.fn().mockResolvedValue(customMeetingNotes),
		});
		const templates = await loadAvailableTemplates(plugin);
		const meetingNotes = templates.find((t) => t.name === "Meeting Notes");
		expect(meetingNotes?.description).toBe("My custom meeting notes");
		expect(meetingNotes?.version).toBe("2.0");
		// Should not appear twice
		expect(templates.filter((t) => t.name === "Meeting Notes")).toHaveLength(1);
	});

	it("skips non-.md files in the vault folder", async () => {
		const plugin = makePlugin("Templates/Transcription", {
			exists: vi.fn().mockResolvedValue(true),
			list: vi.fn().mockResolvedValue({
				files: ["Templates/Transcription/notes.txt", "Templates/Transcription/image.png"],
				folders: [],
			}),
			read: vi.fn(),
		});
		const templates = await loadAvailableTemplates(plugin);
		// read should not have been called for non-.md files
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(plugin.app.vault.adapter.read).not.toHaveBeenCalled();
		expect(templates).toHaveLength(7); // only built-ins
	});

	it("skips a malformed custom template without throwing", async () => {
		const plugin = makePlugin("Templates/Transcription", {
			exists: vi.fn().mockResolvedValue(true),
			list: vi.fn().mockResolvedValue({ files: ["Templates/Transcription/bad.md"], folders: [] }),
			read: vi.fn().mockResolvedValue("no frontmatter here"),
		});
		const templates = await loadAvailableTemplates(plugin);
		expect(templates).toHaveLength(7); // only built-ins survived
	});

	it("returns only built-ins when vault folder does not exist", async () => {
		const plugin = makePlugin("Templates/Transcription", {
			exists: vi.fn().mockResolvedValue(false),
		});
		const templates = await loadAvailableTemplates(plugin);
		expect(templates).toHaveLength(7);
	});
});
