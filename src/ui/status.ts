export class StatusIndicator {
	private el: HTMLElement;

	constructor(el: HTMLElement) {
		this.el = el;
		this.setRecording(false);
	}

	setRecording(active: boolean): void {
		this.el.setText(active ? "● Recording" : "");
		if (active) {
			this.el.addClass("speakeasy-recording");
		} else {
			this.el.removeClass("speakeasy-recording");
		}
	}
}
