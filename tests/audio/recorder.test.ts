import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioRecorder, MicPermissionError, NoMicrophoneError, AlreadyRecordingError } from "../../src/audio/recorder";

// ---------------------------------------------------------------------------
// MediaRecorder mock
// ---------------------------------------------------------------------------

class MockMediaRecorder {
	state: "inactive" | "recording" = "inactive";
	ondataavailable: ((e: { data: Blob }) => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: ((e: unknown) => void) | null = null;

	private chunks: Blob[] = [];

	start() {
		this.state = "recording";
		// Immediately fire a data chunk so tests can resolve
		setTimeout(() => {
			if (this.ondataavailable) {
				this.ondataavailable({ data: new Blob(["audio"], { type: "audio/webm" }) });
			}
		}, 0);
	}

	stop() {
		this.state = "inactive";
		setTimeout(() => {
			if (this.onstop) this.onstop();
		}, 0);
	}

	static isTypeSupported() {
		return true;
	}
}

// ---------------------------------------------------------------------------
// navigator.mediaDevices mock helpers
// ---------------------------------------------------------------------------

function mockGetUserMediaSuccess() {
	const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
	vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue(stream);
}

function mockGetUserMediaPermissionDenied() {
	const err = Object.assign(new Error("Permission denied"), { name: "NotAllowedError" });
	vi.spyOn(navigator.mediaDevices, "getUserMedia").mockRejectedValue(err);
}

function mockGetUserMediaNoDevices() {
	const err = Object.assign(new Error("Requested device not found"), { name: "NotFoundError" });
	vi.spyOn(navigator.mediaDevices, "getUserMedia").mockRejectedValue(err);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AudioRecorder", () => {
	let recorder: AudioRecorder;

	beforeEach(() => {
		vi.stubGlobal("MediaRecorder", MockMediaRecorder);

		Object.defineProperty(navigator, "mediaDevices", {
			value: { getUserMedia: vi.fn(), enumerateDevices: vi.fn() },
			writable: true,
			configurable: true,
		});

		recorder = new AudioRecorder();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("startRecording resolves when getUserMedia succeeds", async () => {
		mockGetUserMediaSuccess();
		await expect(recorder.startRecording()).resolves.toBeUndefined();
	});

	it("stopRecording resolves with a Blob of audio data", async () => {
		mockGetUserMediaSuccess();
		await recorder.startRecording();
		const blob = await recorder.stopRecording();
		expect(blob).toBeInstanceOf(Blob);
	});

	it("throws MicPermissionError when permission is denied", async () => {
		mockGetUserMediaPermissionDenied();
		await expect(recorder.startRecording()).rejects.toThrow(MicPermissionError);
	});

	it("throws NoMicrophoneError when no mic is found", async () => {
		mockGetUserMediaNoDevices();
		await expect(recorder.startRecording()).rejects.toThrow(NoMicrophoneError);
	});

	it("throws AlreadyRecordingError when startRecording is called while already recording", async () => {
		mockGetUserMediaSuccess();
		await recorder.startRecording();
		await expect(recorder.startRecording()).rejects.toThrow(AlreadyRecordingError);
	});

	it("accepts an optional deviceId and passes it to getUserMedia", async () => {
		mockGetUserMediaSuccess();
		const spy = vi.spyOn(navigator.mediaDevices, "getUserMedia");
		await recorder.startRecording("device-abc");
		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				audio: expect.objectContaining({ deviceId: "device-abc" }),
			})
		);
	});
});
