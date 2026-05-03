import type { HealthResponse, TranscribeResponse } from "../types";

export class BackendUnreachableError extends Error {
	constructor(cause?: string) {
		super(`Speakeasy backend is unreachable${cause ? `: ${cause}` : "."}`);
		this.name = "BackendUnreachableError";
	}
}

export async function checkHealth(baseUrl: string): Promise<HealthResponse> {
	let response: Response;
	try {
		response = await fetch(`${baseUrl}/health`);
	} catch (err) {
		throw new BackendUnreachableError(String(err));
	}
	if (!response.ok) {
		throw new BackendUnreachableError(`HTTP ${response.status}`);
	}
	return response.json() as Promise<HealthResponse>;
}

export async function transcribeAudio(
	baseUrl: string,
	wav: ArrayBuffer,
	model: string
): Promise<TranscribeResponse> {
	const form = new FormData();
	form.append("audio", new Blob([wav], { type: "audio/wav" }), "recording.wav");
	form.append("whisper_model", model);

	let response: Response;
	try {
		response = await fetch(`${baseUrl}/transcribe`, { method: "POST", body: form });
	} catch (err) {
		throw new BackendUnreachableError(String(err));
	}
	if (!response.ok) {
		throw new BackendUnreachableError(`HTTP ${response.status}`);
	}
	return response.json() as Promise<TranscribeResponse>;
}
