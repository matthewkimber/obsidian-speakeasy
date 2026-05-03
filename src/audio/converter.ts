export class EmptyAudioError extends Error {
	constructor() {
		super("Cannot encode WAV: audio buffer has zero samples.");
		this.name = "EmptyAudioError";
	}
}

export function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
	const numSamples = audioBuffer.length;
	if (numSamples === 0) throw new EmptyAudioError();

	const sampleRate = audioBuffer.sampleRate;
	const numChannels = 1;
	const bitDepth = 16;
	const bytesPerSample = bitDepth / 8;
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = numSamples * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	// RIFF chunk descriptor
	writeString(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeString(view, 8, "WAVE");

	// fmt sub-chunk
	writeString(view, 12, "fmt ");
	view.setUint32(16, 16, true);       // sub-chunk size (PCM = 16)
	view.setUint16(20, 1, true);        // audio format (PCM = 1)
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitDepth, true);

	// data sub-chunk
	writeString(view, 36, "data");
	view.setUint32(40, dataSize, true);

	// PCM samples — mix down to mono (channel 0 only; already mono from recorder)
	const samples = audioBuffer.getChannelData(0);
	let offset = 44;
	for (let i = 0; i < numSamples; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
		const int16 = clamped < 0 ? clamped * 32768 : clamped * 32767;
		view.setInt16(offset, Math.round(int16), true);
		offset += 2;
	}

	return buffer;
}

function writeString(view: DataView, offset: number, text: string): void {
	for (let i = 0; i < text.length; i++) {
		view.setUint8(offset + i, text.charCodeAt(i));
	}
}
