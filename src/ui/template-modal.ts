import { App, Modal, Setting } from "obsidian";
import type { ParsedTemplate } from "../types";

export class TemplateSelectionModal extends Modal {
	private templates: ParsedTemplate[];
	private selected: ParsedTemplate;
	private title = "";
	private descEl!: HTMLElement;
	private readonly onSubmit: (template: ParsedTemplate, title: string) => void;

	constructor(
		app: App,
		templates: ParsedTemplate[],
		defaultTemplateName: string,
		onSubmit: (template: ParsedTemplate, title: string) => void,
	) {
		super(app);
		this.templates = templates;
		const first = templates[0];
		if (!first) throw new Error("TemplateSelectionModal requires at least one template");
		this.selected = templates.find((t) => t.name === defaultTemplateName) ?? first;
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

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Start recording")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.selected, this.title.trim());
				}),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
