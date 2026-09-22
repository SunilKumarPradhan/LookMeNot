import React from "react";
import ReactDOM from "react-dom/client";
import { detectLangfusePage } from "./core/discovery";
import { OPEN_PANEL_EVENT, OPEN_PANEL_MESSAGE, panelBus } from "./core/panelBus";
import { ExtensionApp } from "./components/ExtensionApp";
import appCss from "./styles/extension.css?inline";

interface RuntimeMessageApi {
  runtime?: {
    onMessage: {
      addListener: (listener: (message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => void) => void;
    };
  };
}

declare global {
  interface Window {
    __LOOKMENOT_CONTENT_LOADED__?: boolean;
  }
}

const HOST_ID = "lookmenot-extension-root";

function listenForOpenRequests() {
  const scope = globalThis as unknown as { browser?: RuntimeMessageApi; chrome?: RuntimeMessageApi };
  const runtime = scope.browser?.runtime ?? scope.chrome?.runtime;
  runtime?.onMessage.addListener((message, _sender, sendResponse) => {
    if ((message as { kind?: string } | null)?.kind !== OPEN_PANEL_MESSAGE) return;
    panelBus.dispatchEvent(new Event(OPEN_PANEL_EVENT));
    sendResponse({ ok: true });
  });
}

function mountApp() {
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = appCss;
  const appRoot = document.createElement("div");
  shadowRoot.append(style, appRoot);

  ReactDOM.createRoot(appRoot).render(
    <React.StrictMode>
      <ExtensionApp initialOpen={detectLangfusePage()} />
    </React.StrictMode>
  );
}

// The reader can be loaded twice in one tab (manifest content script plus toolbar click).
// Only the first copy mounts and listens; the toolbar path messages that first copy.
if (!window.__LOOKMENOT_CONTENT_LOADED__) {
  window.__LOOKMENOT_CONTENT_LOADED__ = true;
  listenForOpenRequests();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountApp, { once: true });
  } else {
    mountApp();
  }
}
