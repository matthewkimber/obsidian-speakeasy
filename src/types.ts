export interface TranscriptSegment {
	start: number;
	end: number;
	speaker: string;
	text: string;
}

export interface TranscribeResponse {
	duration_seconds: number;
	segments: TranscriptSegment[];
}

export interface HealthResponse {
	status: string;
	models: string[];
}

export interface ParsedTemplate {
	name: string;
	description: string;
	version: string;
	slug: string;
	body: string;
}

export interface TemplateVars {
	title: string;
	date: string;
	duration: string;
	speakers: string;
	template_name: string;
	transcript: string;
	audio_path: string;
}
