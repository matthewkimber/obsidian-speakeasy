import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAnnotations } from "../../src/templates/annotator";
import * as ollama from "../../src/utils/ollama";
import { parseTemplate } from "../../src/templates/parser";

vi.mock("../../src/utils/ollama", async (importOriginal) => {
	const mod = await importOriginal<typeof import("../../src/utils/ollama")>();
	return { ...mod, generateAnnotation: vi.fn() };
});

const SETTINGS = { baseUrl: "http://localhost:11434", model: "llama3" };

function makeTemplate(body: string) {
	return parseTemplate(`---\nname: T\ndescription: d\nversion: 1.0\n---\n${body}`);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("runAnnotations", () => {
	it("returns empty map and no error when template has no LLM blocks", async () => {
		const t = makeTemplate("# {{title}}\n{{transcript}}");
		const result = await runAnnotations(t, "transcript text", SETTINGS);
		expect(result.annotations.size).toBe(0);
		expect(result.error).toBeNull();
	});

	it("calls generateAnnotation once per LLM block", async () => {
		vi.spyOn(ollama, "generateAnnotation").mockResolvedValue("output");
		const t = makeTemplate(
			"{{llm:summary}}\nSummarise.\n{{/llm}}\n{{llm:actions}}\nList actions.\n{{/llm}}",
		);
		await runAnnotations(t, "transcript", SETTINGS);
		expect(ollama.generateAnnotation).toHaveBeenCalledTimes(2);
	});

	it("stores each annotation under its block key", async () => {
		vi.spyOn(ollama, "generateAnnotation")
			.mockResolvedValueOnce("The summary.")
			.mockResolvedValueOnce("Action 1.");
		const t = makeTemplate(
			"{{llm:summary}}\nSummarise.\n{{/llm}}\n{{llm:actions}}\nList actions.\n{{/llm}}",
		);
		const { annotations } = await runAnnotations(t, "transcript", SETTINGS);
		expect(annotations.get("summary")).toBe("The summary.");
		expect(annotations.get("actions")).toBe("Action 1.");
	});

	it("includes the transcript in the prompt sent to Ollama", async () => {
		const spy = vi.spyOn(ollama, "generateAnnotation").mockResolvedValue("out");
		const t = makeTemplate("{{llm:summary}}\nSummarise this.\n{{/llm}}");
		await runAnnotations(t, "TRANSCRIPT_CONTENT", SETTINGS);
		const prompt = spy.mock.calls[0]?.[2] ?? "";
		expect(prompt).toContain("Summarise this.");
		expect(prompt).toContain("TRANSCRIPT_CONTENT");
	});

	it("calls progress callback with index and total", async () => {
		vi.spyOn(ollama, "generateAnnotation").mockResolvedValue("out");
		const t = makeTemplate(
			"{{llm:summary}}\nSummarise.\n{{/llm}}\n{{llm:actions}}\nList.\n{{/llm}}",
		);
		const onProgress = vi.fn();
		await runAnnotations(t, "transcript", SETTINGS, onProgress);
		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2);
		expect(onProgress).toHaveBeenNthCalledWith(2, 2, 2);
	});

	it("returns error type unreachable and stops on OllamaUnreachableError", async () => {
		vi.spyOn(ollama, "generateAnnotation").mockRejectedValue(
			new ollama.OllamaUnreachableError("connection refused"),
		);
		const t = makeTemplate(
			"{{llm:summary}}\nSummarise.\n{{/llm}}\n{{llm:actions}}\nList.\n{{/llm}}",
		);
		const { annotations, error } = await runAnnotations(t, "transcript", SETTINGS);
		expect(error).toEqual({ type: "unreachable" });
		// Both remaining blocks get placeholder keys in the map
		expect(annotations.size).toBe(2);
	});

	it("returns error type model_not_found on OllamaModelNotFoundError", async () => {
		vi.spyOn(ollama, "generateAnnotation").mockRejectedValue(
			new ollama.OllamaModelNotFoundError("llama3"),
		);
		const t = makeTemplate("{{llm:summary}}\nSummarise.\n{{/llm}}");
		const { error } = await runAnnotations(t, "transcript", SETTINGS);
		expect(error).toEqual({ type: "model_not_found", model: "llama3" });
	});

	it("uses fallback placeholder for individual annotation failures", async () => {
		vi.spyOn(ollama, "generateAnnotation")
			.mockResolvedValueOnce("Good summary.")
			.mockRejectedValueOnce(new Error("unknown error"));
		const t = makeTemplate(
			"{{llm:summary}}\nSummarise.\n{{/llm}}\n{{llm:actions}}\nList.\n{{/llm}}",
		);
		const { annotations, error } = await runAnnotations(t, "transcript", SETTINGS);
		expect(error).toBeNull();
		expect(annotations.get("summary")).toBe("Good summary.");
		expect(annotations.get("actions")).toContain("failed");
	});

	it("passes baseUrl and model to generateAnnotation", async () => {
		const spy = vi.spyOn(ollama, "generateAnnotation").mockResolvedValue("out");
		const t = makeTemplate("{{llm:summary}}\nSummarise.\n{{/llm}}");
		await runAnnotations(t, "t", { baseUrl: "http://custom:9999", model: "mistral" });
		expect(spy).toHaveBeenCalledWith("http://custom:9999", "mistral", expect.any(String));
	});
});
