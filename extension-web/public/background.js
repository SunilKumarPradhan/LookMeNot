const extensionApi = globalThis.browser || globalThis.chrome;

extensionApi.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    await extensionApi.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["assets/content.js"],
    });
  } catch {
    // The content script may already be present, or the page may block script injection.
  }

  try {
    await extensionApi.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.postMessage({ source: "lookmenot-extension", kind: "open-panel" }, "*");
      },
    });
  } catch {
    // Ignore restricted browser pages such as chrome:// URLs.
  }
});
