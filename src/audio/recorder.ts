export class MicPermissionError extends Error {
	constructor() {
		super("Microphone access denied. Enable mic in system settings.");
		this.name = "MicPermissionError";
	}
}

export class NoMicrophoneError extends Error {
	constructor() {
		super("No microphone detected.");
		this.name = "NoMicrophoneError";
	}
}

export class AlreadyRecordingError extends Error {
	constructor() {
		super("A recording is already in progress.");
		this.name = "AlreadyRecordingError";
	}
}

export class AudioRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;

	async startRecording(deviceId?: string): Promise<void> {
		if (this.mediaRecorder?.state === "recording") {
			throw new AlreadyRecordingError();
		}

		const constraints: MediaStreamConstraints = {
			audio: {
				sampleRate: 16000,
				channelCount: 1,
				...(deviceId ? { deviceId } : {}),
			},
		};

		try {
			this.stream = await navigator.mediaDevices.getUserMedia(constraints);
		} catch (err) {
			if (err instanceof Error) {
				if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
					throw new MicPermissionError();
				}
				if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
					throw new NoMicrophoneError();
				}
			}
			throw err;
		}

		this.mediaRecorder = new MediaRecorder(this.stream);
		this.mediaRecorder.start();
	}

	stopRecording(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
				reject(new Error("Not recording."));
				return;
			}

			const chunks: Blob[] = [];

			this.mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunks.push(e.data);
			};

			this.mediaRecorder.onstop = () => {
				const blob = new Blob(chunks, { type: "audio/webm" });
				this.stream?.getTracks().forEach((t) => t.stop());
				this.stream = null;
				this.mediaRecorder = null;
				resolve(blob);
			};

			this.mediaRecorder.onerror = (e) => reject(e);
			this.mediaRecorder.stop();
		});
	}

	get isRecording(): boolean {
		return this.mediaRecorder?.state === "recording";
	}
}
