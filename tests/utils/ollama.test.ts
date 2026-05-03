import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestUrl } from "obsidian";
import { generateAnnotation, OllamaUnreachableError, OllamaModelNotFoundError } from "../../src/utils/ollama";

const mockRequestUrl = vi.mocked(requestUrl);

beforeEach(() => {
	vi.clearAllMocks();
});

describe("generateAnnotation", () => {
	it("calls the correct Ollama endpoint", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: { response: "The summary." },
			text: "",
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		await generateAnnotation("http://localhost:11434", "llama3", "Summarise this.");

		expect(mockRequestUrl).toHaveBeenCalledOnce();
		const call = mockRequestUrl.mock.calls[0]?.[0];
		expect(call).toMatchObject({
			url: "http://localhost:11434/api/generate",
			method: "POST",
			contentType: "application/json",
		});
	});

	it("sends model and prompt in the request body", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: { response: "Result." },
			text: "",
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		await generateAnnotation("http://localhost:11434", "mistral", "My prompt.");

		const call = mockRequestUrl.mock.calls[0]?.[0];
		if (typeof call === "object" && "body" in call) {
			const body = JSON.parse(call.body as string) as unknown;
			expect(body).toMatchObject({ model: "mistral", prompt: "My prompt.", stream: false });
		}
	});

	it("returns the response text on success", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: { response: "Generated text." },
			text: "",
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const result = await generateAnnotation("http://localhost:11434", "llama3", "prompt");
		expect(result).toBe("Generated text.");
	});

	it("throws OllamaUnreachableError when the request fails", async () => {
		mockRequestUrl.mockRejectedValueOnce(new Error("connection refused"));

		await expect(
			generateAnnotation("http://localhost:11434", "llama3", "prompt"),
		).rejects.toBeInstanceOf(OllamaUnreachableError);
	});

	it("throws OllamaModelNotFoundError on 404", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 404,
			json: {},
			text: "",
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		await expect(
			generateAnnotation("http://localhost:11434", "llama3", "prompt"),
		).rejects.toBeInstanceOf(OllamaModelNotFoundError);
	});

	it("throws OllamaUnreachableError on non-2xx status other than 404", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 500,
			json: {},
			text: "",
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		await expect(
			generateAnnotation("http://localhost:11434", "llama3", "prompt"),
		).rejects.toBeInstanceOf(OllamaUnreachableError);
	});

	it("returns empty string when response field is missing", async () => {
		mockRequestUrl.mockResolvedValueOnce({
			status: 200,
			json: {},
			text: "",
			headers: {},
			arrayBuffer: new ArrayBuffer(0),
		});

		const result = await generateAnnotation("http://localhost:11434", "llama3", "prompt");
		expect(result).toBe("");
	});
});
