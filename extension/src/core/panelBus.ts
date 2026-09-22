// In-bundle signal from the extension message listener to the React panel.
// Kept as a module-level EventTarget so page scripts cannot see or forge it.
export const OPEN_PANEL_MESSAGE = "lookmenot:open-panel";

export const panelBus = new EventTarget();
export const OPEN_PANEL_EVENT = "open-panel";
