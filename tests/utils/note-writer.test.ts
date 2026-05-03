import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	formatTimestamp,
	formatDuration,
	buildTranscriptNote,
	writeTranscriptNote,
} from "../../src/utils/note-writer";
import type { TranscribeResponse } from "../../src/types";
import { App } from "obsidian";

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

describe("formatTimestamp", () => {
	it("formats zero seconds as 00:00", () => {
		expect(formatTimestamp(0)).toBe("00:00");
	});

	it("formats seconds-only values as MM:SS", () => {
		expect(formatTimestamp(65)).toBe("01:05");
	});

	it("pads single-digit seconds", () => {
		expect(formatTimestamp(61)).toBe("01:01");
	});

	it("formats values under 1 hour as MM:SS", () => {
		expect(formatTimestamp(3599)).toBe("59:59");
	});

	it("formats values >= 1 hour as H:MM:SS", () => {
		expect(formatTimestamp(3600)).toBe("1:00:00");
	});

	it("formats large values correctly", () => {
		expect(formatTimestamp(7322)).toBe("2:02:02");
	});

	it("floors fractional seconds", () => {
		expect(formatTimestamp(61.9)).toBe("01:01");
	});
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
	it("returns seconds only for durations under 1 minute", () => {
		expect(formatDuration(45)).toBe("45s");
	});

	it("returns minutes and seconds", () => {
		expect(formatDuration(125)).toBe("2m 5s");
	});

	it("omits seconds when exactly on a minute boundary", () => {
		expect(formatDuration(120)).toBe("2m");
	});

	it("handles zero duration", () => {
		expect(formatDuration(0)).toBe("0s");
	});

	it("handles large durations", () => {
		expect(formatDuration(3725)).toBe("62m 5s");
	});
});

// ---------------------------------------------------------------------------
// buildTranscriptNote
// ---------------------------------------------------------------------------

const sampleResponse: TranscribeResponse = {
	duration_seconds: 125.4,
	segments: [
		{ start: 0.0, end: 4.3, speaker: "", text: "Hello, how are you?" },
		{ start: 4.5, end: 9.1, speaker: "", text: "I am doing well, thanks." },
	],
};

describe("buildTranscriptNote", () => {
	it("includes YAML frontmatter with date key", () => {
		const note = buildTranscriptNote(sampleResponse, "Recordings/2024-01-01.wav");
		expect(note).toMatch(/^---\n/);
		expect(note).toMatch(/date:/);
		expect(note).toMatch(/---/);
	});

	it("includes duration in frontmatter", () => {
		const note = buildTranscriptNote(sampleResponse, "Recordings/rec.wav");
		expect(note).toMatch(/duration: "2m 5s"/);
	});

	it("includes audio path in frontmatter", () => {
		const note = buildTranscriptNote(sampleResponse, "Recordings/my-rec.wav");
		expect(note).toMatch(/audio: "Recordings\/my-rec.wav"/);
	});

	it("includes a Transcript heading", () => {
		const note = buildTranscriptNote(sampleResponse, "Recordings/rec.wav");
		expect(note).toContain("## Transcript");
	});

	it("formats each segment as [MM:SS] text", () => {
		const note = buildTranscriptNote(sampleResponse, "Recordings/rec.wav");
		expect(note).toContain("[00:00] Hello, how are you?");
		expect(note).toContain("[00:04] I am doing well, thanks.");
	});

	it("shows (no speech detected) when segments are empty", () => {
		const emptyResponse: TranscribeResponse = { duration_seconds: 5, segments: [] };
		const note = buildTranscriptNote(emptyResponse, "Recordings/rec.wav");
		expect(note).toContain("(no speech detected)");
	});

	it("trims whitespace from segment text", () => {
		const response: TranscribeResponse = {
			duration_seconds: 5,
			segments: [{ start: 0, end: 2, speaker: "", text: "  hello  " }],
		};
		const note = buildTranscriptNote(response, "Recordings/rec.wav");
		expect(note).toContain("[00:00] hello");
		expect(note).not.toContain("  hello  ");
	});
});

// ---------------------------------------------------------------------------
// writeTranscriptNote
// ---------------------------------------------------------------------------

describe("writeTranscriptNote", () => {
	it("saves a file to the noteOutputFolder and returns its path", async () => {
		const mockApp = new App();
		const mockPlugin = {
			app: mockApp,
			settings: { noteOutputFolder: "Transcripts" },
		} as unknown as import("../../src/main").default;

		// vault methods are vi.fn() stubs defined in __mocks__/obsidian.ts
		const createSpy = mockApp.vault.create as ReturnType<typeof vi.fn>;

		const path = await writeTranscriptNote(mockPlugin, sampleResponse, "Recordings/rec.wav");

		expect(path).toMatch(/^Transcripts\/transcript-/);
		expect(path).toMatch(/\.md$/);
		expect(createSpy).toHaveBeenCalledOnce();
	});
});
