import type { ParsedTemplate } from "../types";
import { extractLlmBlocks } from "./parser";
import { generateAnnotation, OllamaUnreachableError, OllamaModelNotFoundError } from "../utils/ollama";

const LLM_ANNOTATION_FAILED = "_Annotation failed._";

export interface AnnotationSettings {
	baseUrl: string;
	model: string;
}

export type AnnotationError =
	| { type: "unreachable" }
	| { type: "model_not_found"; model: string }
	| null;

export async function runAnnotations(
	template: ParsedTemplate,
	transcript: string,
	settings: AnnotationSettings,
	onProgress?: (index: number, total: number) => void,
): Promise<{ annotations: Map<string, string>; error: AnnotationError }> {
	const blocks = extractLlmBlocks(template.body);
	const annotations = new Map<string, string>();

	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i];
		if (!block) continue;
		onProgress?.(i + 1, blocks.length);

		const prompt = assemblePrompt(block.prompt, transcript);
		try {
			const result = await generateAnnotation(settings.baseUrl, settings.model, prompt);
			annotations.set(block.key, result);
		} catch (err) {
			if (err instanceof OllamaUnreachableError) {
				for (const remaining of blocks.slice(i)) {
					if (remaining && !annotations.has(remaining.key)) {
						annotations.set(remaining.key, LLM_ANNOTATION_FAILED);
					}
				}
				return { annotations, error: { type: "unreachable" } };
			}
			if (err instanceof OllamaModelNotFoundError) {
				for (const remaining of blocks.slice(i)) {
					if (remaining && !annotations.has(remaining.key)) {
						annotations.set(remaining.key, LLM_ANNOTATION_FAILED);
					}
				}
				return { annotations, error: { type: "model_not_found", model: err.model } };
			}
			annotations.set(block.key, LLM_ANNOTATION_FAILED);
		}
	}

	return { annotations, error: null };
}

function assemblePrompt(instruction: string, transcript: string): string {
	return `${instruction}\n\n## Transcript\n\n${transcript}`;
}
