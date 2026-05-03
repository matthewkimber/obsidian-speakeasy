import { describe, it, expect, vi } from "vitest";
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
// buildTranscriptNote — speaker rendering
// ---------------------------------------------------------------------------

const twoSpeakerResponse: TranscribeResponse = {
	duration_seconds: 20,
	segments: [
		{ start: 0.0, end: 4.0, speaker: "Speaker 1", text: "Hello, how are you?" },
		{ start: 4.5, end: 9.0, speaker: "Speaker 2", text: "I am doing well, thanks." },
		{ start: 9.5, end: 14.0, speaker: "Speaker 1", text: "Great to hear." },
		{ start: 14.5, end: 19.0, speaker: "Speaker 2", text: "Let us get started." },
	],
};

describe("buildTranscriptNote — speaker rendering", () => {
	it("groups consecutive segments under a speaker header", () => {
		const note = buildTranscriptNote(twoSpeakerResponse, "rec.wav");
		expect(note).toContain("**Speaker 1**");
		expect(note).toContain("**Speaker 2**");
	});

	it("places each segment line under its speaker block", () => {
		const note = buildTranscriptNote(twoSpeakerResponse, "rec.wav");
		// Speaker 1 block contains first segment
		const s1Block = note.indexOf("**Speaker 1**");
		const s2Block = note.indexOf("**Speaker 2**");
		expect(s1Block).toBeLessThan(note.indexOf("[00:00] Hello, how are you?"));
		expect(s2Block).toBeLessThan(note.indexOf("[00:04] I am doing well, thanks."));
	});

	it("merges consecutive same-speaker segments into one block", () => {
		const response: TranscribeResponse = {
			duration_seconds: 10,
			segments: [
				{ start: 0, end: 3, speaker: "Speaker 1", text: "First." },
				{ start: 3, end: 6, speaker: "Speaker 1", text: "Second." },
				{ start: 6, end: 9, speaker: "Speaker 2", text: "Third." },
			],
		};
		const note = buildTranscriptNote(response, "rec.wav");
		// Speaker 1 header appears exactly once
		const occurrences = note.split("**Speaker 1**").length - 1;
		expect(occurrences).toBe(1);
	});

	it("includes speaker list in frontmatter when speakers are present", () => {
		const note = buildTranscriptNote(twoSpeakerResponse, "rec.wav");
		expect(note).toMatch(/speakers: "Speaker 1, Speaker 2"/);
	});

	it("omits speakers frontmatter field when all speakers are empty", () => {
		const note = buildTranscriptNote(sampleResponse, "rec.wav");
		expect(note).not.toContain("speakers:");
	});

	it("falls back to flat format when all speakers are empty", () => {
		const note = buildTranscriptNote(sampleResponse, "rec.wav");
		expect(note).not.toContain("**Speaker");
		expect(note).toContain("[00:00] Hello, how are you?");
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
		// eslint-disable-next-line @typescript-eslint/unbound-method
		const createSpy = mockApp.vault.create as ReturnType<typeof vi.fn>;

		const path = await writeTranscriptNote(mockPlugin, sampleResponse, "Recordings/rec.wav");

		expect(path).toMatch(/^Transcripts\/transcript-/);
		expect(path).toMatch(/\.md$/);
		expect(createSpy).toHaveBeenCalledOnce();
	});
});
