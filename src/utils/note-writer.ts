import { normalizePath } from "obsidian";
import type SpeakeasyPlugin from "../main";
import type { TranscribeResponse } from "../types";

export function formatTimestamp(seconds: number): string {
	const total = Math.floor(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(seconds: number): string {
	const total = Math.floor(seconds);
	const m = Math.floor(total / 60);
	const s = total % 60;
	if (m === 0) return `${s}s`;
	if (s === 0) return `${m}m`;
	return `${m}m ${s}s`;
}

export function buildTranscriptNote(response: TranscribeResponse, audioPath: string): string {
	const date = new Date().toISOString().slice(0, 10);
	const duration = formatDuration(response.duration_seconds);

	const frontmatter = [
		"---",
		`date: ${date}`,
		`duration: "${duration}"`,
		`audio: "${audioPath}"`,
		"---",
	].join("\n");

	const heading = "\n## Transcript\n";

	let body: string;
	if (response.segments.length === 0) {
		body = "\n(no speech detected)\n";
	} else {
		body =
			"\n" +
			response.segments
				.map((seg) => `[${formatTimestamp(seg.start)}] ${seg.text.trim()}`)
				.join("\n") +
			"\n";
	}

	return frontmatter + "\n" + heading + body;
}

export async function writeTranscriptNote(
	plugin: SpeakeasyPlugin,
	response: TranscribeResponse,
	audioPath: string
): Promise<string> {
	const folder = normalizePath(plugin.settings.noteOutputFolder);
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.slice(0, 19);
	const filename = `transcript-${timestamp}.md`;
	const filePath = `${folder}/${filename}`;

	const exists = await plugin.app.vault.adapter.exists(folder);
	if (!exists) {
		await plugin.app.vault.createFolder(folder);
	}

	const content = buildTranscriptNote(response, audioPath);
	await plugin.app.vault.create(filePath, content);

	return filePath;
}
