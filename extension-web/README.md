# LookMeNot Browser Extension

LookMeNot turns Langfuse traces, tool calls, tool results, and agent actions into a left-side conversation pane on top of the Langfuse UI.

## What Is Included

- Manifest V3 browser extension in `extension-web/`.
- Standalone React content-script UI with its own parser and styles.
- Automatic injection on `https://*.langfuse.com/*`.
- Toolbar-button injection for self-hosted Langfuse pages through `activeTab`.
- Page/network JSON bridge for Langfuse trace payloads.
- Manual upload/paste fallback for `input.json` plus optional `output.json`.
- Chrome Web Store and Mozilla Add-ons draft assets in `store-assets/`.

## Local Development

```powershell
cd extension-web
npm install
npm run build
```

Load the extension locally:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Choose `extension-web/dist`.

For self-hosted Langfuse pages, click the LookMeNot toolbar icon while the Langfuse tab is active. For Langfuse Cloud pages matching `https://*.langfuse.com/*`, the pane loads automatically.

## Package For Your Browser

Use the interactive picker for Chrome, Brave, Edge, or Firefox:

```powershell
cd extension-web
npm run get-package
```

Packages are written to:

```text
extension-web/dist-packages/
```

Each browser folder includes an `INSTALL.txt` with exact install or upload steps.

## Package For Chrome Web Store

```powershell
cd extension-web
npm run package
```

This creates:

```text
extension-web/dist-packages/chromium/LOOKMENOT-CHROMIUM-EXTENSION.zip
extension-web/dist-packages/chromium/lookmenot-unpacked/
```

The ZIP contains `manifest.json` at the root, which is required by the Chrome Web Store.

## Package For Mozilla Add-ons

```powershell
cd extension-web
npm run package:firefox
```

This creates:

```text
extension-web/dist-packages/firefox/LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip
extension-web/dist-packages/firefox/LOOKMENOT-SOURCE-CODE-NO-WARNINGS-DO-NOT-UPLOAD-AS-ADDON.zip
```

## Store Assets

`store-assets/` contains:

- `store-icon-128.png`
- `screenshot-1280x800.png`
- `small-promo-440x280.png`
- `chrome-store-listing.md`
- `privacy-policy.md`

Before public submission, host the privacy policy at a public HTTPS URL and paste that URL into the Chrome Web Store privacy fields.

## Permissions

- `activeTab`: lets the user open LookMeNot on self-hosted Langfuse pages by clicking the toolbar icon.
- `scripting`: injects the content script after that user action.
- `https://langfuse.com/*` and `https://*.langfuse.com/*`: auto-loads the reader on Langfuse Cloud pages.

## Privacy Posture

Trace JSON is processed locally in the browser. The extension does not send trace content to LookMeNot servers, analytics providers, or third parties. The page bridge only posts captured JSON from the page context to the content script running in the same tab.
