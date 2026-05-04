import { describe, it, expect, vi } from "vitest";
import { App, TFile, TFolder } from "obsidian";
import { loadAvailableTemplates, BUILTIN_TEMPLATE_NAMES } from "../../src/templates/loader";

function makePlugin(templateFolder = "Templates/Transcription", vaultOverrides: Record<string, unknown> = {}) {
	const mockApp = new App();
	Object.assign(mockApp.vault, vaultOverrides);
	return {
		app: mockApp,
		settings: { templateFolder },
	} as unknown as import("../../src/main").default;
}

function makeTFolder(folderPath: string, files: Array<{ path: string; name: string; content: string }>) {
	const children = files.map((f) => Object.assign(new TFile(), { path: f.path, name: f.name }));
	return Object.assign(new TFolder(), {
		path: folderPath,
		name: folderPath.split("/").pop() ?? folderPath,
		children,
	});
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
		const folder = makeTFolder("Templates/Transcription", [
			{ path: "Templates/Transcription/my-custom.md", name: "my-custom.md", content: customContent },
		]);
		const plugin = makePlugin("Templates/Transcription", {
			getFolderByPath: vi.fn().mockReturnValue(folder),
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
		const folder = makeTFolder("Templates/Transcription", [
			{ path: "Templates/Transcription/meeting-notes.md", name: "meeting-notes.md", content: customMeetingNotes },
		]);
		const plugin = makePlugin("Templates/Transcription", {
			getFolderByPath: vi.fn().mockReturnValue(folder),
			read: vi.fn().mockResolvedValue(customMeetingNotes),
		});
		const templates = await loadAvailableTemplates(plugin);
		const meetingNotes = templates.find((t) => t.name === "Meeting Notes");
		expect(meetingNotes?.description).toBe("My custom meeting notes");
		expect(meetingNotes?.version).toBe("2.0");
		expect(templates.filter((t) => t.name === "Meeting Notes")).toHaveLength(1);
	});

	it("skips non-.md files in the vault folder", async () => {
		const folder = makeTFolder("Templates/Transcription", [
			{ path: "Templates/Transcription/notes.txt", name: "notes.txt", content: "" },
			{ path: "Templates/Transcription/image.png", name: "image.png", content: "" },
		]);
		const readMock = vi.fn();
		const plugin = makePlugin("Templates/Transcription", {
			getFolderByPath: vi.fn().mockReturnValue(folder),
			read: readMock,
		});
		const templates = await loadAvailableTemplates(plugin);
		expect(readMock).not.toHaveBeenCalled();
		expect(templates).toHaveLength(7); // only built-ins
	});

	it("skips a malformed custom template without throwing", async () => {
		const folder = makeTFolder("Templates/Transcription", [
			{ path: "Templates/Transcription/bad.md", name: "bad.md", content: "" },
		]);
		const plugin = makePlugin("Templates/Transcription", {
			getFolderByPath: vi.fn().mockReturnValue(folder),
			read: vi.fn().mockResolvedValue("no frontmatter here"),
		});
		const templates = await loadAvailableTemplates(plugin);
		expect(templates).toHaveLength(7); // only built-ins survived
	});

	it("returns only built-ins when vault folder does not exist", async () => {
		const plugin = makePlugin("Templates/Transcription", {
			getFolderByPath: vi.fn().mockReturnValue(null),
		});
		const templates = await loadAvailableTemplates(plugin);
		expect(templates).toHaveLength(7);
	});
});
