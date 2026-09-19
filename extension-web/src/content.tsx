import React from "react";
import ReactDOM from "react-dom/client";
import { detectLangfusePage } from "./core/discovery";
import { ExtensionApp } from "./components/ExtensionApp";
import appCss from "./styles/extension.css?inline";

interface ExtensionRuntimeApi {
  getURL: (path: string) => string;
}

interface ExtensionGlobalApi {
  runtime?: ExtensionRuntimeApi;
}

declare const chrome: ExtensionGlobalApi | undefined;
declare const browser: ExtensionGlobalApi | undefined;

declare global {
  interface Window {
    __LOOKMENOT_CONTENT_LOADED__?: boolean;
  }
}

const HOST_ID = "lookmenot-extension-root";

function injectPageBridge() {
  try {
    const runtime = chrome?.runtime ?? browser?.runtime;
    if (!runtime?.getURL) return;
    if (document.documentElement.hasAttribute("data-lookmenot-bridge")) return;
    document.documentElement.setAttribute("data-lookmenot-bridge", "true");
    const script = document.createElement("script");
    script.src = runtime.getURL("page-bridge.js");
    script.async = false;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch {
    // Bridge injection is opportunistic; DOM scanning and manual import still work.
  }
}

function mountApp() {
  if (window.__LOOKMENOT_CONTENT_LOADED__) {
    window.postMessage({ source: "lookmenot-extension", kind: "open-panel" }, "*");
    return;
  }

  window.__LOOKMENOT_CONTENT_LOADED__ = true;
  injectPageBridge();

  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = appCss;
  const appRoot = document.createElement("div");
  shadowRoot.append(style, appRoot);

  const runtime = chrome?.runtime ?? browser?.runtime;

  ReactDOM.createRoot(appRoot).render(
    <React.StrictMode>
      <ExtensionApp initialOpen={detectLangfusePage()} brandIconUrl={runtime?.getURL?.("icons/icon-48.png")} />
    </React.StrictMode>
  );
}

if (document.readyState === "loading") {
  injectPageBridge();
  document.addEventListener("DOMContentLoaded", mountApp, { once: true });
} else {
  mountApp();
}
