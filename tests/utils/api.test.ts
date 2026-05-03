import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkHealth, transcribeAudio, BackendUnreachableError } from "../../src/utils/api";
import type { HealthResponse, TranscribeResponse } from "../../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(body),
		})
	);
}

function mockFetchHttpError(status: number): void {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: false,
			status,
			json: () => Promise.resolve({ detail: "error" }),
		})
	);
}

function mockFetchNetworkFailure(): void {
	vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
}

// ---------------------------------------------------------------------------
// checkHealth
// ---------------------------------------------------------------------------

describe("checkHealth", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("resolves with HealthResponse on 200", async () => {
		const expected: HealthResponse = { status: "ok", models: ["base", "small"] };
		mockFetchOk(expected);
		const result = await checkHealth("http://localhost:8765");
		expect(result).toEqual(expected);
	});

	it("calls the correct endpoint", async () => {
		mockFetchOk({ status: "ok", models: [] });
		await checkHealth("http://localhost:8765");
		expect(vi.mocked(fetch)).toHaveBeenCalledWith("http://localhost:8765/health");
	});

	it("throws BackendUnreachableError on network failure", async () => {
		mockFetchNetworkFailure();
		await expect(checkHealth("http://localhost:8765")).rejects.toThrow(BackendUnreachableError);
	});

	it("throws BackendUnreachableError on non-2xx HTTP response", async () => {
		mockFetchHttpError(503);
		await expect(checkHealth("http://localhost:8765")).rejects.toThrow(BackendUnreachableError);
	});
});

// ---------------------------------------------------------------------------
// transcribeAudio
// ---------------------------------------------------------------------------

describe("transcribeAudio", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const mockWav = new ArrayBuffer(8);

	it("resolves with TranscribeResponse on 200", async () => {
		const expected: TranscribeResponse = {
			duration_seconds: 10,
			segments: [{ start: 0, end: 5, speaker: "Speaker 1", text: "Hello" }],
		};
		mockFetchOk(expected);
		const result = await transcribeAudio("http://localhost:8765", mockWav, "base");
		expect(result).toEqual(expected);
	});

	it("calls the correct endpoint with POST", async () => {
		mockFetchOk({ duration_seconds: 0, segments: [] });
		await transcribeAudio("http://localhost:8765", mockWav, "tiny");
		expect(vi.mocked(fetch)).toHaveBeenCalledWith(
			"http://localhost:8765/transcribe",
			expect.objectContaining({ method: "POST" })
		);
	});

	it("sends the model parameter in the form body", async () => {
		mockFetchOk({ duration_seconds: 0, segments: [] });
		await transcribeAudio("http://localhost:8765", mockWav, "small");
		const call = vi.mocked(fetch).mock.calls[0];
		const body = call?.[1]?.body as FormData;
		expect(body.get("whisper_model")).toBe("small");
	});

	it("throws BackendUnreachableError on network failure", async () => {
		mockFetchNetworkFailure();
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			BackendUnreachableError
		);
	});

	it("throws BackendUnreachableError on non-2xx HTTP response", async () => {
		mockFetchHttpError(500);
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			BackendUnreachableError
		);
	});
});
