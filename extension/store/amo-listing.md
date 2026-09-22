# Mozilla Add-ons (AMO) Listing

Paste these values into the Developer Hub listing form. Limits: name 50 characters, summary 250.

## Name

LookMeNot - Trace Reader for Langfuse

## Summary

Read Langfuse traces as a conversation: messages, tool calls, tool results and thinking blocks in a searchable side pane. Runs locally; no data leaves your browser. Unofficial, not affiliated with Langfuse.

## Category

Developer Tools

## Description

LookMeNot turns Langfuse trace data into a readable conversation so you can follow what an AI agent actually did without reading nested JSON.

Open a trace on Langfuse Cloud and a side pane appears on the left. It shows messages, tool calls, tool results, thinking blocks and observations in order.

What you can do:
- Read a trace as a chat-style timeline
- Expand or collapse tool calls and tool results
- Show or hide thinking blocks, tool calls and tool results
- Search messages, tool names and tool inputs, and jump to an entry by number
- Upload or paste trace JSON when a page cannot be read automatically
- Use it on a self-hosted Langfuse by clicking the toolbar button on that tab

Privacy:
- Trace data is processed inside your browser tab only
- No network requests of its own, no analytics, no remote code
- Nothing is stored; the extension does not write to the page's storage
- Open source (MIT): https://github.com/SunilKumarPradhan/LookMeNot

Permissions:
- Access to https://*.cloud.langfuse.com/* so the pane can open automatically on Langfuse Cloud (EU, US and other regions)
- "activeTab" and "scripting" so that, only after you click the toolbar button, the pane can open on a self-hosted Langfuse tab

LookMeNot is an independent project. It is not made by, affiliated with or endorsed by Langfuse. "Langfuse" is used only to describe compatibility.

## Support

- Support site: https://github.com/SunilKumarPradhan/LookMeNot/issues
- License: MIT
- Privacy policy: paste the text of `privacy-policy.md` into the listing's privacy policy field.

## Version Notes (0.2.0)

Initial public release. Local Langfuse trace reader pane, automatic opening on Langfuse Cloud, toolbar activation for self-hosted Langfuse, JSON upload/paste, search, filters and expandable tool cards.

## Notes To Reviewer

No account or credentials are needed.

Fastest way to review, without a Langfuse account:
1. Install the add-on and open any page on https://cloud.langfuse.com (the login page is enough) or click the toolbar button on any normal web page to open the pane.
2. In the pane click "Upload JSON" and choose `test-data/sample-trace.json` from the source archive (also at https://github.com/SunilKumarPradhan/LookMeNot/blob/main/extension/test-data/sample-trace.json), or click "Paste JSON" and paste it into "Input JSON".
3. The conversation renders: 12 entries covering system/user/assistant text, a thinking block, tool calls and tool results. Try search, the filter toggles, expand/collapse and jump-to-entry.

With a Langfuse Cloud account, opening any trace page fills the pane automatically.

How it reads data (all in `public/page-bridge.js`, unminified):
- A content script runs in the page world on https://*.cloud.langfuse.com/* (manifest `"world": "MAIN"`). It wraps `fetch`/`XMLHttpRequest` and, for same-origin Langfuse API/trace URLs only, forwards a copy of JSON responses to the extension content script with `window.postMessage`, addressed to the page's own origin. Nothing is sent to any server.
- The add-on has no `storage`, `tabs`, `webRequest`, `cookies` or `<all_urls>` permission and no `web_accessible_resources`.
- `data_collection_permissions` is `["none"]`: no data is collected or transmitted.

Build from source (Windows, macOS or Linux), from the uploaded source archive:
- Node.js 24 (`.nvmrc`), npm 10+.
- `npm ci`
- `npm run build:firefox`
- Result is `dist/firefox/`. It is byte-for-byte the content of the uploaded add-on zip. There is no post-processing step.
- `assets/content.js` is the minified Vite bundle of `src/` plus React 18.3, react-dom, lucide-react and @tanstack/react-virtual (all unmodified release versions from npm, pinned in `package-lock.json`). `background.js`, `page-bridge.js`, the icons and `manifest.json` are unminified.

Linter (`npm run lint:firefox`, i.e. `web-ext lint`): 0 errors, 2 warnings, both `UNSAFE_VAR_ASSIGNMENT` on `assets/content.js` line 5. Both point into the same function inside react-dom's bundled runtime: its internal implementation of the `dangerouslySetInnerHTML` prop (SVG-namespace variant, at columns ~6172 and ~6230 of the minified line). This extension's own code never uses `dangerouslySetInnerHTML` and never assigns to `.innerHTML` — verify with `grep -rn "innerHTML\|dangerouslySetInnerHTML" src/` from `extension/`, zero matches. The two flagged calls are unreachable in this extension: nothing in `src/` sets that prop, so react-dom's own SVG-innerHTML fallback is dead code that ships only because it's part of the single `react-dom` package bundle, not because this extension calls it.
