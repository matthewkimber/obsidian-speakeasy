import { Notice, normalizePath } from "obsidian";
import type SpeakeasyPlugin from "../main";
import { MicPermissionError, NoMicrophoneError, AlreadyRecordingError } from "../audio/recorder";
import { encodeWav } from "../audio/converter";
import { transcribeAudio, BackendUnreachableError } from "../utils/api";
import { writeTranscriptNote } from "../utils/note-writer";

const RIBBON_ICON_IDLE = "mic";

export function registerRecordingCommands(plugin: SpeakeasyPlugin): void {
	plugin.addCommand({
		id: "speakeasy-start-recording",
		name: "Start recording",
		callback: () => startRecording(plugin),
	});

	plugin.addCommand({
		id: "speakeasy-stop-recording",
		name: "Stop recording",
		callback: () => stopRecording(plugin),
	});
}

export function addRecordingRibbonIcon(plugin: SpeakeasyPlugin): HTMLElement {
	return plugin.addRibbonIcon(RIBBON_ICON_IDLE, "Speakeasy: start recording", () => {
		if (plugin.recorder.isRecording) {
			void stopRecording(plugin);
		} else {
			void startRecording(plugin);
		}
	});
}

async function startRecording(plugin: SpeakeasyPlugin): Promise<void> {
	try {
		const deviceId = plugin.settings.microphoneDeviceId || undefined;
		await plugin.recorder.startRecording(deviceId);
		plugin.statusIndicator?.setRecording(true);
		plugin.ribbonIcon?.setAttribute("aria-label", "Speakeasy: stop recording");
	} catch (err) {
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
		// Fire-and-forget — transcription is async and non-blocking
		void transcribeAndWrite(plugin, wav, filePath);
	} catch (err) {
		new Notice("Failed to stop recording. Check the console for details.");
		console.error("[Speakeasy] stopRecording error:", err);
	}
}

async function saveRecording(
	plugin: SpeakeasyPlugin,
	blob: Blob
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
	await plugin.app.vault.adapter.writeBinary(filePath, wav);

	new Notice(`Recording saved: ${filePath}`);
	return { wav, filePath };
}

async function transcribeAndWrite(
	plugin: SpeakeasyPlugin,
	wav: ArrayBuffer,
	audioFilePath: string
): Promise<void> {
	plugin.statusIndicator?.setProcessing("⏳ Transcribing…");
	try {
		const response = await transcribeAudio(
			plugin.settings.backendUrl,
			wav,
			plugin.settings.whisperModel
		);
		const notePath = await writeTranscriptNote(plugin, response, audioFilePath);
		plugin.statusIndicator?.clear();
		new Notice(`Transcript ready: ${notePath}`);
	} catch (err) {
		plugin.statusIndicator?.clear();
		if (err instanceof BackendUnreachableError) {
			new Notice("Backend unreachable — is the Speakeasy server running?");
		} else {
			new Notice(`Transcription failed: ${err instanceof Error ? err.message : String(err)}`);
			console.error("[Speakeasy] transcribeAndWrite error:", err);
		}
	}
}

async function ensureFolder(plugin: SpeakeasyPlugin, folderPath: string): Promise<void> {
	const exists = await plugin.app.vault.adapter.exists(folderPath);
	if (!exists) {
		await plugin.app.vault.createFolder(folderPath);
	}
}

function isoTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
