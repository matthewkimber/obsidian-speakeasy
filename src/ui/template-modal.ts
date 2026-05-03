import { App, Modal, Setting } from "obsidian";
import type { ParsedTemplate } from "../types";

export class TemplateSelectionModal extends Modal {
	private templates: ParsedTemplate[];
	private selected: ParsedTemplate;
	private title = "";
	private skipOllama = false;
	private descEl!: HTMLElement;
	private readonly ollamaEnabled: boolean;
	private readonly onSubmit: (template: ParsedTemplate, title: string, skipOllama: boolean) => void;

	constructor(
		app: App,
		templates: ParsedTemplate[],
		defaultTemplateName: string,
		ollamaEnabled: boolean,
		onSubmit: (template: ParsedTemplate, title: string, skipOllama: boolean) => void,
	) {
		super(app);
		this.templates = templates;
		const first = templates[0];
		if (!first) throw new Error("TemplateSelectionModal requires at least one template");
		this.selected = templates.find((t) => t.name === defaultTemplateName) ?? first;
		this.ollamaEnabled = ollamaEnabled;
		this.onSubmit = onSubmit;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		new Setting(contentEl).setName("New recording").setHeading();

		new Setting(contentEl).setName("Template").addDropdown((drop) => {
			for (const t of this.templates) drop.addOption(t.name, t.name);
			drop.setValue(this.selected.name).onChange((value) => {
				const found = this.templates.find((t) => t.name === value);
				if (found) {
					this.selected = found;
					this.descEl.setText(found.description);
				}
			});
		});

		this.descEl = contentEl.createEl("p", {
			cls: "speakeasy-template-desc",
			text: this.selected.description,
		});

		new Setting(contentEl)
			.setName("Title")
			.addText((text) =>
				text
					.setPlaceholder("Team standup")
					.onChange((value) => {
						this.title = value;
					}),
			);

		if (this.ollamaEnabled) {
			new Setting(contentEl)
				.setName("Annotate with Ollama")
				.setDesc("Use the local LLM to fill in template sections.")
				.addToggle((toggle) =>
					toggle.setValue(true).onChange((value) => {
						this.skipOllama = !value;
					}),
				);
		}

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Start recording")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.selected, this.title.trim(), this.skipOllama);
				}),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
