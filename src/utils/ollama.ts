import { requestUrl } from "obsidian";

export class OllamaUnreachableError extends Error {
	constructor(cause?: string) {
		super(`Ollama is unreachable${cause ? `: ${cause}` : "."}`);
		this.name = "OllamaUnreachableError";
	}
}

export class OllamaModelNotFoundError extends Error {
	constructor(public readonly model: string) {
		super(`Ollama model "${model}" is not available. Run: ollama pull ${model}`);
		this.name = "OllamaModelNotFoundError";
	}
}

export async function generateAnnotation(
	baseUrl: string,
	model: string,
	prompt: string,
): Promise<string> {
	let response;
	try {
		response = await requestUrl({
			url: `${baseUrl}/api/generate`,
			method: "POST",
			contentType: "application/json",
			body: JSON.stringify({ model, prompt, stream: false }),
		});
	} catch (err) {
		throw new OllamaUnreachableError(String(err));
	}

	if (response.status === 404) throw new OllamaModelNotFoundError(model);
	if (response.status < 200 || response.status >= 300) {
		throw new OllamaUnreachableError(`HTTP ${response.status}`);
	}

	const body = response.json as { response?: string };
	return body.response ?? "";
}
