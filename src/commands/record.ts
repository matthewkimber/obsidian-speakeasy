import { Notice, normalizePath } from "obsidian";
import type SpeakeasyPlugin from "../main";
import { AudioRecorder, MicPermissionError, NoMicrophoneError, AlreadyRecordingError } from "../audio/recorder";
import { encodeWav } from "../audio/converter";

const RIBBON_ICON_IDLE = "mic";
const RIBBON_ICON_ACTIVE = "square";

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
			stopRecording(plugin);
		} else {
			startRecording(plugin);
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
		await saveRecording(plugin, blob);
	} catch (err) {
		new Notice("Failed to stop recording. Check the console for details.");
		console.error("[Speakeasy] stopRecording error:", err);
	}
}

async function saveRecording(plugin: SpeakeasyPlugin, blob: Blob): Promise<void> {
	const arrayBuffer = await blob.arrayBuffer();
	const audioContext = new AudioContext();
	const decoded = await audioContext.decodeAudioData(arrayBuffer);
	await audioContext.close();

	const wav = encodeWav(decoded);
	const folder = normalizePath(plugin.settings.audioOutputFolder);
	const filename = `recording-${formatTimestamp()}.wav`;
	const filePath = `${folder}/${filename}`;

	await ensureFolder(plugin, folder);
	await plugin.app.vault.adapter.writeBinary(filePath, wav);

	new Notice(`Recording saved: ${filePath}`);
}

async function ensureFolder(plugin: SpeakeasyPlugin, folderPath: string): Promise<void> {
	const exists = await plugin.app.vault.adapter.exists(folderPath);
	if (!exists) {
		await plugin.app.vault.createFolder(folderPath);
	}
}

function formatTimestamp(): string {
	const now = new Date();
	return now
		.toISOString()
		.replace(/[:.]/g, "-")
		.slice(0, 19);
}
