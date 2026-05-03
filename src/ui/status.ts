export class StatusIndicator {
	private el: HTMLElement;

	constructor(el: HTMLElement) {
		this.el = el;
		this.clear();
	}

	setRecording(active: boolean): void {
		this.el.setText(active ? "● Recording" : "");
		if (active) {
			this.el.addClass("speakeasy-recording");
		} else {
			this.el.removeClass("speakeasy-recording");
		}
	}

	setProcessing(message: string): void {
		this.el.setText(message);
		this.el.removeClass("speakeasy-recording");
		this.el.addClass("speakeasy-processing");
	}

	clear(): void {
		this.el.setText("");
		this.el.removeClass("speakeasy-recording");
		this.el.removeClass("speakeasy-processing");
	}
}
