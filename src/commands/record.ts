import { Notice, normalizePath } from "obsidian";
import type SpeakeasyPlugin from "../main";
import { MicPermissionError, NoMicrophoneError, AlreadyRecordingError } from "../audio/recorder";
import { encodeWav } from "../audio/converter";
import { transcribeAudio, BackendUnreachableError, WhisperModelNotFoundError, AudioTooShortError } from "../utils/api";
import { writeTranscriptNote, buildTranscriptText } from "../utils/note-writer";
import { loadAvailableTemplates } from "../templates/loader";
import { extractLlmBlocks } from "../templates/parser";
import { runAnnotations } from "../templates/annotator";
import { TemplateSelectionModal } from "../ui/template-modal";
import type { ParsedTemplate } from "../types";

const RIBBON_ICON_IDLE = "mic";

export function registerRecordingCommands(plugin: SpeakeasyPlugin): void {
	plugin.addCommand({
		id: "start-recording",
		name: "Start recording",
		callback: () => void openTemplateModal(plugin),
	});

	plugin.addCommand({
		id: "stop-recording",
		name: "Stop recording",
		callback: () => void stopRecording(plugin),
	});
}

export function addRecordingRibbonIcon(plugin: SpeakeasyPlugin): HTMLElement {
	return plugin.addRibbonIcon(RIBBON_ICON_IDLE, "Speakeasy: start recording", () => {
		if (plugin.recorder.isRecording) {
			void stopRecording(plugin);
		} else {
			void openTemplateModal(plugin);
		}
	});
}

async function openTemplateModal(plugin: SpeakeasyPlugin): Promise<void> {
	let templates: ParsedTemplate[];
	try {
		templates = await loadAvailableTemplates(plugin);
	} catch {
		new Notice("Failed to load templates. Check the console for details.");
		return;
	}

	new TemplateSelectionModal(
		plugin.app,
		templates,
		plugin.settings.defaultTemplate,
		plugin.settings.ollamaEnabled,
		(template, title, skipOllama) => void startRecording(plugin, template, title, skipOllama),
	).open();
}

async function startRecording(
	plugin: SpeakeasyPlugin,
	template: ParsedTemplate,
	title: string,
	skipOllama: boolean,
): Promise<void> {
	plugin.activeTemplate = template;
	plugin.activeTitle = title || formatDefaultTitle();
	plugin.activeSkipOllama = skipOllama;
	try {
		const deviceId = plugin.settings.microphoneDeviceId || undefined;
		await plugin.recorder.startRecording(deviceId);
		plugin.statusIndicator?.setRecording(true);
		plugin.ribbonIcon?.setAttribute("aria-label", "Speakeasy: stop recording");
	} catch (err) {
		plugin.activeTemplate = null;
		plugin.activeTitle = "";
		plugin.activeSkipOllama = false;
		if (err instanceof MicPermissionError) {
			new Notice("Microphone access denied. Enable mic in system settings.");
		} else if (err instanceof NoMicrophoneError) {
			new Notice("No microphone detected.");
		} else if (err instanceof AlreadyRecordingError) {
			new Notice("Already recording.");
		} else {
			new Notice("Failed to start recording. Check the console for details.");
			console.error("[Speakeasy] startRecording error:", err);
		}
	}
}

async function stopRecording(plugin: SpeakeasyPlugin): Promise<void> {
	try {
		const blob = await plugin.recorder.stopRecording();
		plugin.statusIndicator?.setRecording(false);
		plugin.ribbonIcon?.setAttribute("aria-label", "Speakeasy: start recording");

		const { wav, filePath } = await saveRecording(plugin, blob);
		const template = plugin.activeTemplate;
		const title = plugin.activeTitle;
		const skipOllama = plugin.activeSkipOllama;
		plugin.activeTemplate = null;
		plugin.activeTitle = "";
		plugin.activeSkipOllama = false;
		// Fire-and-forget — transcription + annotation is async and non-blocking
		void transcribeAndWrite(plugin, wav, filePath, template ?? undefined, title, skipOllama);
	} catch (err) {
		new Notice("Failed to stop recording. Check the console for details.");
		console.error("[Speakeasy] stopRecording error:", err);
	}
}

async function saveRecording(
	plugin: SpeakeasyPlugin,
	blob: Blob,
): Promise<{ wav: ArrayBuffer; filePath: string }> {
	const arrayBuffer = await blob.arrayBuffer();
	const audioContext = new AudioContext();
	const decoded = await audioContext.decodeAudioData(arrayBuffer);
	await audioContext.close();

	const wav = encodeWav(decoded);
	const folder = normalizePath(plugin.settings.audioOutputFolder);
	const filename = `recording-${isoTimestamp()}.wav`;
	const filePath = `${folder}/${filename}`;

	await ensureFolder(plugin, folder);
	await plugin.app.vault.createBinary(filePath, wav);

	new Notice(`Recording saved: ${filePath}`);
	return { wav, filePath };
}

async function transcribeAndWrite(
	plugin: SpeakeasyPlugin,
	wav: ArrayBuffer,
	audioFilePath: string,
	template: ParsedTemplate | undefined,
	title: string,
	skipOllama: boolean,
): Promise<void> {
	plugin.statusIndicator?.setProcessing("⏳ Transcribing…");
	try {
		const response = await transcribeAudio(
			plugin.settings.backendUrl,
			wav,
			plugin.settings.whisperModel,
			plugin.settings.numSpeakers,
		);

		let annotations: Map<string, string> | undefined;
		if (
			template &&
			plugin.settings.ollamaEnabled &&
			!skipOllama &&
			extractLlmBlocks(template.body).length > 0
		) {
			plugin.statusIndicator?.setProcessing("⏳ Annotating…");
			const transcript = buildTranscriptText(response);
			const { annotations: ann, error } = await runAnnotations(
				template,
				transcript,
				{ baseUrl: plugin.settings.ollamaBaseUrl, model: plugin.settings.ollamaModel },
				(idx, total) =>
					plugin.statusIndicator?.setProcessing(`⏳ Annotating (${idx}/${total})…`),
			);
			annotations = ann;

			if (error?.type === "unreachable") {
				new Notice(
					"Ollama unreachable — annotation skipped. Check that Ollama is running.",
				);
			} else if (error?.type === "model_not_found") {
				new Notice(
					`Ollama model "${error.model}" not found. Run: ollama pull ${error.model}`,
				);
			}
		}

		const notePath = await writeTranscriptNote(
			plugin,
			response,
			audioFilePath,
			template,
			title,
			annotations,
		);
		plugin.statusIndicator?.clear();
		new Notice(`Transcript ready: ${notePath}`);
	} catch (err) {
		plugin.statusIndicator?.clear();
		if (err instanceof BackendUnreachableError) {
			new Notice(
				"Transcription backend is not running. Start it before recording.",
			);
		} else if (err instanceof WhisperModelNotFoundError) {
			new Notice(
				`Whisper model "${plugin.settings.whisperModel}" is not downloaded. ` +
				`Run the backend once to trigger the download, or change the model in settings.`,
			);
		} else if (err instanceof AudioTooShortError) {
			new Notice("Recording is too short to transcribe. Record at least a few seconds of audio.");
		} else {
			new Notice(
				`Transcription failed: ${err instanceof Error ? err.message : String(err)}`,
			);
			console.error("[Speakeasy] transcribeAndWrite error:", err);
		}
	}
}

async function ensureFolder(plugin: SpeakeasyPlugin, folderPath: string): Promise<void> {
	if (!plugin.app.vault.getFolderByPath(folderPath)) {
		await plugin.app.vault.createFolder(folderPath);
	}
}

function formatDefaultTitle(): string {
	return `Recording — ${new Date().toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})}`;
}

function isoTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
