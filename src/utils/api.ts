import { requestUrl } from "obsidian";
import type { HealthResponse, TranscribeResponse } from "../types";

export class BackendUnreachableError extends Error {
	constructor(cause?: string) {
		super(`Speakeasy backend is unreachable${cause ? `: ${cause}` : "."}`);
		this.name = "BackendUnreachableError";
	}
}

export class WhisperModelNotFoundError extends Error {
	constructor(public readonly model: string) {
		super(`Whisper model "${model}" is not downloaded.`);
		this.name = "WhisperModelNotFoundError";
	}
}

export class AudioTooShortError extends Error {
	constructor() {
		super("Audio is too short to transcribe.");
		this.name = "AudioTooShortError";
	}
}

export async function checkHealth(baseUrl: string): Promise<HealthResponse> {
	let response;
	try {
		response = await requestUrl(`${baseUrl}/health`);
	} catch (err) {
		throw new BackendUnreachableError(String(err));
	}
	if (response.status < 200 || response.status >= 300) {
		throw new BackendUnreachableError(`HTTP ${response.status}`);
	}
	return response.json as HealthResponse;
}

export async function transcribeAudio(
	baseUrl: string,
	wav: ArrayBuffer,
	model: string,
	numSpeakers = 0
): Promise<TranscribeResponse> {
	const boundary = `speakeasy${Date.now()}`;
	const body = buildMultipartBody(wav, model, boundary, numSpeakers);

	let response;
	try {
		response = await requestUrl({
			url: `${baseUrl}/transcribe`,
			method: "POST",
			contentType: `multipart/form-data; boundary=${boundary}`,
			body,
		});
	} catch (err) {
		throw new BackendUnreachableError(String(err));
	}
	if (response.status < 200 || response.status >= 300) {
		const detail = (response.json as Record<string, unknown>)?.detail;
		if (response.status === 404 && detail === "whisper_model_not_found") {
			throw new WhisperModelNotFoundError(model);
		}
		if (response.status === 422 && detail === "audio_too_short") {
			throw new AudioTooShortError();
		}
		throw new BackendUnreachableError(`HTTP ${response.status}`);
	}
	return response.json as TranscribeResponse;
}

function buildMultipartBody(
	wav: ArrayBuffer,
	model: string,
	boundary: string,
	numSpeakers: number
): ArrayBuffer {
	const enc = new TextEncoder();
	const modelPart = enc.encode(
		`--${boundary}\r\nContent-Disposition: form-data; name="whisper_model"\r\n\r\n${model}\r\n`
	);
	const speakersPart =
		numSpeakers > 0
			? enc.encode(
					`--${boundary}\r\nContent-Disposition: form-data; name="num_speakers"\r\n\r\n${numSpeakers}\r\n`
			  )
			: new Uint8Array(0);
	const audioHeader = enc.encode(
		`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="recording.wav"\r\nContent-Type: audio/wav\r\n\r\n`
	);
	const ending = enc.encode(`\r\n--${boundary}--\r\n`);
	const total =
		modelPart.byteLength +
		speakersPart.byteLength +
		audioHeader.byteLength +
		wav.byteLength +
		ending.byteLength;
	const buf = new Uint8Array(total);
	let offset = 0;
	buf.set(modelPart, offset); offset += modelPart.byteLength;
	buf.set(speakersPart, offset); offset += speakersPart.byteLength;
	buf.set(audioHeader, offset); offset += audioHeader.byteLength;
	buf.set(new Uint8Array(wav), offset); offset += wav.byteLength;
	buf.set(ending, offset);
	return buf.buffer;
}
