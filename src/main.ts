import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, SpeakeasySettingTab, type SpeakeasySettings } from "./settings";
import { registerCommands } from "./commands/index";
import { AudioRecorder } from "./audio/recorder";
import { StatusIndicator } from "./ui/status";
import type { ParsedTemplate } from "./types";

export default class SpeakeasyPlugin extends Plugin {
	settings!: SpeakeasySettings;
	recorder!: AudioRecorder;
	statusIndicator: StatusIndicator | null = null;
	ribbonIcon: HTMLElement | null = null;
	activeTemplate: ParsedTemplate | null = null;
	activeTitle = "";

	async onload(): Promise<void> {
		await this.loadSettings();

		this.recorder = new AudioRecorder();

		if (this.settings.showStatusBar) {
			this.statusIndicator = new StatusIndicator(this.addStatusBarItem());
		}

		this.addSettingTab(new SpeakeasySettingTab(this.app, this));
		registerCommands(this);
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SpeakeasySettings>
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
