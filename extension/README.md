# LookMeNot - Trace Reader for Langfuse (browser extension)

LookMeNot renders Langfuse traces, tool calls, tool results, and agent actions as a readable conversation in a left-side pane. Everything runs locally in the browser tab.

Unofficial project. Not affiliated with or endorsed by Langfuse.

## Layout

```text
extension/
+-- manifests/         # firefox.json, chrome.json (version is injected from package.json)
+-- public/            # copied as-is into the build: background.js, page-bridge.js, icons/
+-- scripts/           # build.mjs, package-source.mjs
+-- src/               # React + TypeScript content script (bundled by Vite)
+-- test-data/         # sample-trace.json for manual Upload / Paste testing
+-- store/             # store listing copy, privacy policy, screenshots (not shipped in the add-on)
+-- PUBLISHING.md      # how to submit / update on addons.mozilla.org
```

Generated folders (git-ignored): `dist/<browser>/` (unpacked build) and `artifacts/` (zip files).

## Build

Requirements: Node.js 24 (see `.nvmrc`; `^20.19.0 || >=22.12.0` also works) and npm 10+. Works on Windows, macOS, and Linux.

```bash
npm ci
npm run build:firefox   # -> dist/firefox/
npm run build:chrome    # -> dist/chrome/
```

The build is deterministic and has no post-processing step: `dist/firefox/` is exactly what Vite emits plus `public/` plus the manifest.

| File in `dist/<browser>/` | Origin |
| --- | --- |
| `assets/content.js` | `src/` bundled and minified by Vite (React 18, lucide-react, @tanstack/react-virtual) |
| `background.js`, `page-bridge.js`, `icons/*` | copied unmodified from `public/` |
| `manifest.json` | `manifests/<browser>.json` with `version` from `package.json` |

## Package

```bash
npm run package:firefox   # build + Mozilla add-on lint + artifacts/lookmenot-<version>-firefox.zip
npm run package:chrome    # build + artifacts/lookmenot-<version>-chrome.zip
npm run package:source    # artifacts/lookmenot-<version>-source.zip (upload with the add-on if AMO asks for source)
```

`npm run lint:firefox` runs Mozilla's official linter (`web-ext lint`) on `dist/firefox`.
Expected result: 0 errors, 2 warnings. Both warnings are `UNSAFE_VAR_ASSIGNMENT` inside the bundled React DOM runtime (a fixed `<script>` probe string and its `dangerouslySetInnerHTML` helper). LookMeNot's own code never assigns to `innerHTML` and never uses `dangerouslySetInnerHTML`.

## Try it in Firefox

```bash
npm run build:firefox
npx web-ext run --source-dir dist/firefox
```

Or open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on, and select `dist/firefox/manifest.json`.

Load in Chrome / Edge / Brave: `chrome://extensions` -> Developer mode -> Load unpacked -> `dist/chrome`.

## How it works

- `manifests/*.json` load two content scripts on `https://*.cloud.langfuse.com/*`:
  - `page-bridge.js` in the page world (`"world": "MAIN"`). It wraps `fetch` and `XMLHttpRequest`, and forwards a copy of same-origin Langfuse API/trace JSON responses to the content script with `window.postMessage`, addressed to the page's own origin.
  - `assets/content.js` in the extension world. It mounts the reader inside a shadow root, also scans trace JSON embedded in the page, and lets the user upload or paste JSON.
- For other hosts (self-hosted Langfuse), the toolbar button injects the same two scripts into the active tab only, through `activeTab` + `scripting`. See `public/background.js`.

## Permissions

| Permission | Why |
| --- | --- |
| `https://*.cloud.langfuse.com/*` | Auto-load the reader on Langfuse Cloud (EU, US, and other regions). |
| `activeTab` | Let the user open the reader on a self-hosted Langfuse by clicking the toolbar button. |
| `scripting` | Inject the reader into that tab after the click. |

No `storage`, `tabs`, `webRequest`, `cookies`, or `<all_urls>` permissions. No `web_accessible_resources`.

## Privacy

Trace data stays in the tab. The extension makes no network requests of its own, has no analytics or remote code, and stores nothing (reader filters live in memory only). Firefox manifest declares `data_collection_permissions.required = ["none"]`. Full text: `store/privacy-policy.md`.

## License

MIT, see `../LICENSE`.
