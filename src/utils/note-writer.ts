import { normalizePath } from "obsidian";
import type SpeakeasyPlugin from "../main";
import type { TranscribeResponse, TranscriptSegment, ParsedTemplate, TemplateVars } from "../types";
import { renderTemplate } from "../templates/parser";

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

export function buildTranscriptText(response: TranscribeResponse): string {
	if (response.segments.length === 0) return "(no speech detected)";
	const hasSpeakers = response.segments.some((s) => s.speaker.trim() !== "");
	if (hasSpeakers) return buildSpeakerGroups(response.segments);
	return response.segments.map((seg) => `[${formatTimestamp(seg.start)}] ${seg.text.trim()}`).join("\n");
}

export function buildTranscriptNote(response: TranscribeResponse, audioPath: string): string {
	const date = new Date().toISOString().slice(0, 10);
	const duration = formatDuration(response.duration_seconds);
	const hasSpeakers = response.segments.some((s) => s.speaker.trim() !== "");

	const frontmatterLines = [
		"---",
		`date: ${date}`,
		`duration: "${duration}"`,
		`audio: "${audioPath}"`,
	];
	if (hasSpeakers) {
		const speakerList = uniqueSpeakers(response.segments).join(", ");
		frontmatterLines.push(`speakers: "${speakerList}"`);
	}
	frontmatterLines.push("---");
	const frontmatter = frontmatterLines.join("\n");

	const heading = "\n## Transcript\n";

	let body: string;
	if (response.segments.length === 0) {
		body = "\n(no speech detected)\n";
	} else if (hasSpeakers) {
		body = "\n" + buildSpeakerGroups(response.segments) + "\n";
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

function uniqueSpeakers(segments: TranscriptSegment[]): string[] {
	const seen = new Set<string>();
	const ordered: string[] = [];
	for (const seg of segments) {
		if (seg.speaker && !seen.has(seg.speaker)) {
			seen.add(seg.speaker);
			ordered.push(seg.speaker);
		}
	}
	return ordered;
}

function buildSpeakerGroups(segments: TranscriptSegment[]): string {
	const groups: Array<{ speaker: string; lines: string[] }> = [];
	for (const seg of segments) {
		const last = groups[groups.length - 1];
		const line = `[${formatTimestamp(seg.start)}] ${seg.text.trim()}`;
		if (last && last.speaker === seg.speaker) {
			last.lines.push(line);
		} else {
			groups.push({ speaker: seg.speaker || "Unknown", lines: [line] });
		}
	}
	return groups.map((g) => `**${g.speaker}**\n${g.lines.join("\n")}`).join("\n\n");
}

export async function writeTranscriptNote(
	plugin: SpeakeasyPlugin,
	response: TranscribeResponse,
	audioPath: string,
	template?: ParsedTemplate,
	title?: string,
	annotations?: Map<string, string>,
): Promise<string> {
	const folder = normalizePath(plugin.settings.noteOutputFolder);
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
	const slug = template ? template.slug : "transcript";
	const filename = `${slug}-${timestamp}.md`;
	const filePath = `${folder}/${filename}`;

	if (!plugin.app.vault.getFolderByPath(folder)) {
		await plugin.app.vault.createFolder(folder);
	}

	let content: string;
	if (template) {
		content = buildTemplatedNote(response, audioPath, template, title ?? "", annotations);
	} else {
		content = buildTranscriptNote(response, audioPath);
	}

	await plugin.app.vault.create(filePath, content);
	return filePath;
}

function buildTemplatedNote(
	response: TranscribeResponse,
	audioPath: string,
	template: ParsedTemplate,
	title: string,
	annotations?: Map<string, string>,
): string {
	const date = new Date().toISOString().slice(0, 10);
	const duration = formatDuration(response.duration_seconds);
	const hasSpeakers = response.segments.some((s) => s.speaker.trim() !== "");
	const speakers = hasSpeakers ? uniqueSpeakers(response.segments).join(", ") : "";

	const frontmatterLines = [
		"---",
		`date: ${date}`,
		`duration: "${duration}"`,
		`audio: "${audioPath}"`,
	];
	if (speakers) frontmatterLines.push(`speakers: "${speakers}"`);
	frontmatterLines.push(`template: "${template.name}"`);
	frontmatterLines.push("---");

	const vars: TemplateVars = {
		title: title || `Recording — ${date}`,
		date,
		duration,
		speakers,
		template_name: template.name,
		transcript: buildTranscriptText(response),
		audio_path: audioPath,
	};

	return frontmatterLines.join("\n") + "\n\n" + renderTemplate(template, vars, annotations);
}
