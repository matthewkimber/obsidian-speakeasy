import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encodeWav, EmptyAudioError } from "../../src/audio/converter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAudioBuffer(samples: number[], sampleRate = 16000): AudioBuffer {
	return {
		sampleRate,
		numberOfChannels: 1,
		length: samples.length,
		duration: samples.length / sampleRate,
		getChannelData: (_channel: number) => Float32Array.from(samples),
	} as unknown as AudioBuffer;
}

function readInt32LE(buf: ArrayBuffer, offset: number): number {
	const view = new DataView(buf);
	return view.getInt32(offset, true);
}

function readUint16LE(buf: ArrayBuffer, offset: number): number {
	const view = new DataView(buf);
	return view.getUint16(offset, true);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("encodeWav", () => {
	it("returns an ArrayBuffer", () => {
		const buf = makeAudioBuffer([0, 0.5, -0.5, 1]);
		const result = encodeWav(buf);
		expect(result).toBeInstanceOf(ArrayBuffer);
	});

	it("starts with RIFF header", () => {
		const buf = makeAudioBuffer([0, 0.5, -0.5]);
		const result = encodeWav(buf);
		const header = new Uint8Array(result, 0, 4);
		expect(String.fromCharCode(...header)).toBe("RIFF");
	});

	it("has WAVE format marker at byte 8", () => {
		const buf = makeAudioBuffer([0]);
		const result = encodeWav(buf);
		const marker = new Uint8Array(result, 8, 4);
		expect(String.fromCharCode(...marker)).toBe("WAVE");
	});

	it("encodes as mono (1 channel)", () => {
		const buf = makeAudioBuffer([0, 0.5]);
		const result = encodeWav(buf);
		expect(readUint16LE(result, 22)).toBe(1);
	});

	it("preserves the source sample rate in the header", () => {
		const buf = makeAudioBuffer([0, 0.5], 44100);
		const result = encodeWav(buf);
		expect(readInt32LE(result, 24)).toBe(44100);
	});

	it("uses 16-bit PCM (bit depth = 16)", () => {
		const buf = makeAudioBuffer([0, 0.5]);
		const result = encodeWav(buf);
		expect(readUint16LE(result, 34)).toBe(16);
	});

	it("output length equals 44-byte header + 2 * numSamples", () => {
		const samples = [0, 0.5, -0.5, 1, -1];
		const buf = makeAudioBuffer(samples);
		const result = encodeWav(buf);
		expect(result.byteLength).toBe(44 + samples.length * 2);
	});

	it("throws EmptyAudioError when the buffer has zero samples", () => {
		const buf = makeAudioBuffer([]);
		expect(() => encodeWav(buf)).toThrow(EmptyAudioError);
	});

	it("clamps float samples to [-1, 1] range without overflow", () => {
		const buf = makeAudioBuffer([2, -2, 0.5]);
		const result = encodeWav(buf);
		const view = new DataView(result);
		// First sample (float 2.0) should clamp to 32767
		expect(view.getInt16(44, true)).toBe(32767);
		// Second sample (float -2.0) should clamp to -32768
		expect(view.getInt16(46, true)).toBe(-32768);
	});
});
