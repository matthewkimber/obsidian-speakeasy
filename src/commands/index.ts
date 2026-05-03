import type SpeakeasyPlugin from "../main";
import { registerRecordingCommands, addRecordingRibbonIcon } from "./record";

export function registerCommands(plugin: SpeakeasyPlugin): void {
	plugin.ribbonIcon = addRecordingRibbonIcon(plugin);
	registerRecordingCommands(plugin);
}
