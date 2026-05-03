import { App, PluginSettingTab, Setting } from "obsidian";
import type SpeakeasyPlugin from "./main";

export type WhisperModel = "tiny" | "base" | "small" | "medium" | "large";

export interface SpeakeasySettings {
	backendUrl: string;
	whisperModel: WhisperModel;
	ollamaEnabled: boolean;
	ollamaBaseUrl: string;
	ollamaModel: string;
	microphoneDeviceId: string;
	audioOutputFolder: string;
	noteOutputFolder: string;
	defaultTemplate: string;
	templateFolder: string;
	showStatusBar: boolean;
}

export const DEFAULT_SETTINGS: SpeakeasySettings = {
	backendUrl: "http://localhost:8765",
	whisperModel: "base",
	ollamaEnabled: true,
	ollamaBaseUrl: "http://localhost:11434",
	ollamaModel: "llama3",
	microphoneDeviceId: "",
	audioOutputFolder: "Recordings",
	noteOutputFolder: "Transcripts",
	defaultTemplate: "Meeting Notes",
	templateFolder: "Templates/Transcription",
	showStatusBar: true,
};

export class SpeakeasySettingTab extends PluginSettingTab {
	plugin: SpeakeasyPlugin;

	constructor(app: App, plugin: SpeakeasyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Speakeasy settings" });

		this.renderBackendSection(containerEl);
		this.renderOllamaSection(containerEl);
		this.renderAudioSection(containerEl);
		this.renderNotesSection(containerEl);
	}

	private renderBackendSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Backend").setHeading();

		new Setting(containerEl)
			.setName("Backend URL")
			.setDesc("URL of the local Speakeasy backend (default: http://localhost:8765).")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:8765")
					.setValue(this.plugin.settings.backendUrl)
					.onChange(async (value) => {
						this.plugin.settings.backendUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Whisper model")
			.setDesc("Larger models are more accurate but slower.")
			.addDropdown((drop) => {
				const models: WhisperModel[] = ["tiny", "base", "small", "medium", "large"];
				for (const m of models) drop.addOption(m, m);
				drop
					.setValue(this.plugin.settings.whisperModel)
					.onChange(async (value) => {
						this.plugin.settings.whisperModel = value as WhisperModel;
						await this.plugin.saveSettings();
					});
			});
	}

	private renderOllamaSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("LLM annotation (Ollama)").setHeading();

		new Setting(containerEl)
			.setName("Enable LLM annotation")
			.setDesc("Use Ollama to enrich notes with AI-generated summaries and extractions.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.ollamaEnabled)
					.onChange(async (value) => {
						this.plugin.settings.ollamaEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Ollama base URL")
			.setDesc("URL of the Ollama server (default: http://localhost:11434).")
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:11434")
					.setValue(this.plugin.settings.ollamaBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.ollamaBaseUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Ollama model")
			.setDesc("Model name to use for annotation (e.g. llama3, mistral).")
			.addText((text) =>
				text
					.setPlaceholder("llama3")
					.setValue(this.plugin.settings.ollamaModel)
					.onChange(async (value) => {
						this.plugin.settings.ollamaModel = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderAudioSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Audio").setHeading();

		new Setting(containerEl)
			.setName("Audio output folder")
			.setDesc("Vault folder where raw WAV recordings are saved.")
			.addText((text) =>
				text
					.setPlaceholder("Recordings")
					.setValue(this.plugin.settings.audioOutputFolder)
					.onChange(async (value) => {
						this.plugin.settings.audioOutputFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Microphone device")
			.setDesc("Select the input device. Leave empty to use the system default.")
			.addDropdown((drop) => {
				drop.addOption("", "System default");
				drop
					.setValue(this.plugin.settings.microphoneDeviceId)
					.onChange(async (value) => {
						this.plugin.settings.microphoneDeviceId = value;
						await this.plugin.saveSettings();
					});
				this.populateMicDevices(drop);
			});
	}

	private renderNotesSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Notes").setHeading();

		new Setting(containerEl)
			.setName("Note output folder")
			.setDesc("Vault folder where generated transcript notes are saved.")
			.addText((text) =>
				text
					.setPlaceholder("Transcripts")
					.setValue(this.plugin.settings.noteOutputFolder)
					.onChange(async (value) => {
						this.plugin.settings.noteOutputFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template folder")
			.setDesc("Vault folder containing note templates.")
			.addText((text) =>
				text
					.setPlaceholder("Templates/Transcription")
					.setValue(this.plugin.settings.templateFolder)
					.onChange(async (value) => {
						this.plugin.settings.templateFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default template")
			.setDesc("Template used when starting a new recording.")
			.addText((text) =>
				text
					.setPlaceholder("Meeting Notes")
					.setValue(this.plugin.settings.defaultTemplate)
					.onChange(async (value) => {
						this.plugin.settings.defaultTemplate = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show status bar")
			.setDesc("Display recording status in the Obsidian status bar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showStatusBar)
					.onChange(async (value) => {
						this.plugin.settings.showStatusBar = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private populateMicDevices(drop: { addOption: (v: string, l: string) => unknown }): void {
		if (!navigator.mediaDevices?.enumerateDevices) return;
		navigator.mediaDevices
			.enumerateDevices()
			.then((devices) => {
				for (const d of devices) {
					if (d.kind === "audioinput" && d.deviceId) {
						drop.addOption(
							d.deviceId,
							d.label || `Microphone (${d.deviceId.slice(0, 8)})`
						);
					}
				}
			})
			.catch(() => {
				// permission not yet granted — list populates after first recording
			});
	}
}
