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
