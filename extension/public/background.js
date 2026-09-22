// LookMeNot background script.
//
// Langfuse Cloud pages get the reader automatically through manifest content scripts.
// For any other page (for example a self-hosted Langfuse), clicking the toolbar button
// injects the reader into the active tab only. This relies on the `activeTab` permission.

const extensionApi = globalThis.browser || globalThis.chrome;
const OPEN_PANEL_MESSAGE = "lookmenot:open-panel";

async function requestOpenPanel(tabId) {
  await extensionApi.tabs.sendMessage(tabId, { kind: OPEN_PANEL_MESSAGE });
}

extensionApi.action.onClicked.addListener(async (tab) => {
  if (tab.id === undefined) return;

  try {
    // Reader already loaded in this tab: just open it.
    await requestOpenPanel(tab.id);
    return;
  } catch {
    // No receiver yet; inject the reader below.
  }

  try {
    await extensionApi.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["page-bridge.js"],
      world: "MAIN",
    });
    await extensionApi.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["assets/content.js"],
    });
    await requestOpenPanel(tab.id);
  } catch {
    // Restricted pages (about:, addons.mozilla.org, the Chrome Web Store) cannot be scripted.
  }
});
