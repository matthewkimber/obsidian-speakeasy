import { describe, it, expect, vi, afterEach } from "vitest";
import {
	checkHealth,
	transcribeAudio,
	BackendUnreachableError,
	WhisperModelNotFoundError,
	AudioTooShortError,
} from "../../src/utils/api";
import { requestUrl } from "obsidian";
import type { HealthResponse, TranscribeResponse } from "../../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRequestOk(body: unknown): void {
	vi.mocked(requestUrl).mockResolvedValue({
		status: 200,
		json: body,
		text: "",
		headers: {},
		arrayBuffer: new ArrayBuffer(0),
	});
}

function mockRequestHttpError(status: number, body?: unknown): void {
	vi.mocked(requestUrl).mockResolvedValue({
		status,
		json: body ?? { detail: "error" },
		text: "",
		headers: {},
		arrayBuffer: new ArrayBuffer(0),
	});
}

function mockRequestNetworkFailure(): void {
	vi.mocked(requestUrl).mockRejectedValue(new TypeError("Failed to fetch"));
}

// ---------------------------------------------------------------------------
// checkHealth
// ---------------------------------------------------------------------------

describe("checkHealth", () => {
	afterEach(() => {
		vi.mocked(requestUrl).mockReset();
	});

	it("resolves with HealthResponse on 200", async () => {
		const expected: HealthResponse = { status: "ok", models: ["base", "small"] };
		mockRequestOk(expected);
		const result = await checkHealth("http://localhost:8765");
		expect(result).toEqual(expected);
	});

	it("calls the correct endpoint", async () => {
		mockRequestOk({ status: "ok", models: [] });
		await checkHealth("http://localhost:8765");
		expect(vi.mocked(requestUrl)).toHaveBeenCalledWith("http://localhost:8765/health");
	});

	it("throws BackendUnreachableError on network failure", async () => {
		mockRequestNetworkFailure();
		await expect(checkHealth("http://localhost:8765")).rejects.toThrow(BackendUnreachableError);
	});

	it("throws BackendUnreachableError on non-2xx HTTP response", async () => {
		mockRequestHttpError(503);
		await expect(checkHealth("http://localhost:8765")).rejects.toThrow(BackendUnreachableError);
	});
});

// ---------------------------------------------------------------------------
// transcribeAudio
// ---------------------------------------------------------------------------

describe("transcribeAudio", () => {
	afterEach(() => {
		vi.mocked(requestUrl).mockReset();
	});

	const mockWav = new ArrayBuffer(8);

	it("resolves with TranscribeResponse on 200", async () => {
		const expected: TranscribeResponse = {
			duration_seconds: 10,
			segments: [{ start: 0, end: 5, speaker: "Speaker 1", text: "Hello" }],
		};
		mockRequestOk(expected);
		const result = await transcribeAudio("http://localhost:8765", mockWav, "base");
		expect(result).toEqual(expected);
	});

	it("calls the correct endpoint with POST", async () => {
		mockRequestOk({ duration_seconds: 0, segments: [] });
		await transcribeAudio("http://localhost:8765", mockWav, "tiny");
		expect(vi.mocked(requestUrl)).toHaveBeenCalledWith(
			expect.objectContaining({ url: "http://localhost:8765/transcribe", method: "POST" })
		);
	});

	it("sends the model parameter in the multipart body", async () => {
		mockRequestOk({ duration_seconds: 0, segments: [] });
		await transcribeAudio("http://localhost:8765", mockWav, "small");
		const call = vi.mocked(requestUrl).mock.calls[0];
		const param = call?.[0];
		if (typeof param === "object" && param !== null && "body" in param) {
			const bodyText = new TextDecoder().decode(param.body as ArrayBuffer);
			expect(bodyText).toContain("whisper_model");
			expect(bodyText).toContain("small");
		}
	});

	it("throws BackendUnreachableError on network failure", async () => {
		mockRequestNetworkFailure();
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			BackendUnreachableError
		);
	});

	it("throws BackendUnreachableError on non-2xx HTTP response", async () => {
		mockRequestHttpError(500);
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			BackendUnreachableError
		);
	});

	it("throws WhisperModelNotFoundError on 404 with whisper_model_not_found detail", async () => {
		mockRequestHttpError(404, { detail: "whisper_model_not_found" });
		await expect(transcribeAudio("http://localhost:8765", mockWav, "large")).rejects.toThrow(
			WhisperModelNotFoundError
		);
	});

	it("throws AudioTooShortError on 422 with audio_too_short detail", async () => {
		mockRequestHttpError(422, { detail: "audio_too_short" });
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			AudioTooShortError
		);
	});

	it("still throws BackendUnreachableError on generic 404", async () => {
		mockRequestHttpError(404, { detail: "not_found" });
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			BackendUnreachableError
		);
	});

	it("still throws BackendUnreachableError on generic 422", async () => {
		mockRequestHttpError(422, { detail: "validation_error" });
		await expect(transcribeAudio("http://localhost:8765", mockWav, "base")).rejects.toThrow(
			BackendUnreachableError
		);
	});
});
