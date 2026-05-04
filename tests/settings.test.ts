import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, validateUrl, type SpeakeasySettings } from "../src/settings";

describe("DEFAULT_SETTINGS", () => {
	it("has all required keys", () => {
		const keys: (keyof SpeakeasySettings)[] = [
			"backendUrl",
			"whisperModel",
			"ollamaEnabled",
			"ollamaBaseUrl",
			"ollamaModel",
			"microphoneDeviceId",
			"audioOutputFolder",
			"noteOutputFolder",
			"defaultTemplate",
			"templateFolder",
			"showStatusBar",
			"hasSeenOnboarding",
		];
		for (const key of keys) {
			expect(DEFAULT_SETTINGS).toHaveProperty(key);
		}
	});

	it("has correct backendUrl default", () => {
		expect(DEFAULT_SETTINGS.backendUrl).toBe("http://localhost:8765");
	});

	it("has correct ollamaBaseUrl default", () => {
		expect(DEFAULT_SETTINGS.ollamaBaseUrl).toBe("http://localhost:11434");
	});

	it("has ollamaEnabled true by default", () => {
		expect(DEFAULT_SETTINGS.ollamaEnabled).toBe(true);
	});

	it("has showStatusBar true by default", () => {
		expect(DEFAULT_SETTINGS.showStatusBar).toBe(true);
	});

	it("has whisperModel set to base by default", () => {
		expect(DEFAULT_SETTINGS.whisperModel).toBe("base");
	});

	it("has ollamaModel set to llama3 by default", () => {
		expect(DEFAULT_SETTINGS.ollamaModel).toBe("llama3");
	});

	it("has empty microphoneDeviceId by default (use system default)", () => {
		expect(DEFAULT_SETTINGS.microphoneDeviceId).toBe("");
	});

	it("has sensible folder defaults", () => {
		expect(DEFAULT_SETTINGS.audioOutputFolder).toBe("Recordings");
		expect(DEFAULT_SETTINGS.noteOutputFolder).toBe("Transcripts");
		expect(DEFAULT_SETTINGS.templateFolder).toBe("Templates/Transcription");
	});

	it("has defaultTemplate set to Meeting Notes", () => {
		expect(DEFAULT_SETTINGS.defaultTemplate).toBe("Meeting Notes");
	});

	it("whiskerModel is a valid enum value", () => {
		const valid = ["tiny", "base", "small", "medium", "large"];
		expect(valid).toContain(DEFAULT_SETTINGS.whisperModel);
	});
});

describe("validateUrl", () => {
	it("accepts a valid http localhost URL", () => {
		expect(validateUrl("http://localhost:8765")).toBe(true);
	});

	it("accepts a valid https URL", () => {
		expect(validateUrl("https://example.com")).toBe(true);
	});

	it("rejects an empty string", () => {
		expect(validateUrl("")).toBe(false);
	});

	it("rejects a non-URL string", () => {
		expect(validateUrl("not-a-url")).toBe(false);
	});

	it("rejects a URL with no protocol", () => {
		expect(validateUrl("localhost:8765")).toBe(false);
	});

	it("rejects a ftp URL (only http/https accepted)", () => {
		expect(validateUrl("ftp://files.example.com")).toBe(false);
	});

	it("accepts a URL with a path", () => {
		expect(validateUrl("http://localhost:8765/api")).toBe(true);
	});
});
