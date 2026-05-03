import { vi } from "vitest";

export class App {
	vault = new Vault();
	workspace = new Workspace();
}

export class Vault {
	adapter = {
		writeBinary: vi.fn().mockResolvedValue(undefined),
		exists: vi.fn().mockResolvedValue(false),
		mkdir: vi.fn().mockResolvedValue(undefined),
	};
	getAbstractFileByPath = vi.fn().mockReturnValue(null);
	createFolder = vi.fn().mockResolvedValue(undefined);
}

export class Workspace {
	getActiveViewOfType = vi.fn().mockReturnValue(null);
	on = vi.fn().mockReturnValue({ unload: vi.fn() });
}

export class Plugin {
	app: App;
	manifest = { id: "obsidian-speakeasy", name: "Speakeasy", version: "0.1.0" };

	constructor(app: App, manifest?: unknown) {
		this.app = app ?? new App();
	}

	loadData = vi.fn().mockResolvedValue({});
	saveData = vi.fn().mockResolvedValue(undefined);
	addCommand = vi.fn();
	addRibbonIcon = vi.fn().mockReturnValue({ addClass: vi.fn() });
	addStatusBarItem = vi.fn().mockReturnValue({
		setText: vi.fn(),
		setAttr: vi.fn(),
		addClass: vi.fn(),
		removeClass: vi.fn(),
		createEl: vi.fn(),
		empty: vi.fn(),
	});
	addSettingTab = vi.fn();
	registerEvent = vi.fn();
	registerDomEvent = vi.fn();
	registerInterval = vi.fn();
}

export class PluginSettingTab {
	app: App;
	plugin: Plugin;
	containerEl: HTMLElement;

	constructor(app: App, plugin: Plugin) {
		this.app = app;
		this.plugin = plugin;
		this.containerEl = document.createElement("div");
	}

	display(): void {}
	hide(): void {}
}

export class Setting {
	private el: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.el = document.createElement("div");
		containerEl.appendChild(this.el);
	}

	setName = vi.fn().mockReturnThis();
	setDesc = vi.fn().mockReturnThis();
	setHeading = vi.fn().mockReturnThis();
	addText = vi.fn().mockImplementation((cb: (c: TextComponent) => void) => {
		cb(new TextComponent());
		return this;
	});
	addToggle = vi.fn().mockImplementation((cb: (c: ToggleComponent) => void) => {
		cb(new ToggleComponent());
		return this;
	});
	addDropdown = vi.fn().mockImplementation((cb: (c: DropdownComponent) => void) => {
		cb(new DropdownComponent());
		return this;
	});
}

export class TextComponent {
	setPlaceholder = vi.fn().mockReturnThis();
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
	getValue = vi.fn().mockReturnValue("");
}

export class ToggleComponent {
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
	getValue = vi.fn().mockReturnValue(false);
}

export class DropdownComponent {
	addOption = vi.fn().mockReturnThis();
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
	getValue = vi.fn().mockReturnValue("");
}

export class Notice {
	constructor(public message: string, public timeout?: number) {}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement("div");
	}

	open = vi.fn();
	close = vi.fn();
	onOpen(): void {}
	onClose(): void {}
}

export class MarkdownView {
	editor = {
		getSelection: vi.fn().mockReturnValue(""),
		replaceSelection: vi.fn(),
	};
}

export class TFile {
	constructor(public path: string, public name: string) {}
}

export class WorkspaceLeaf {}

export function normalizePath(path: string): string {
	return path.replace(/\\/g, "/");
}
