# LookMeNot Privacy Policy

Effective date: September 21, 2026

LookMeNot is an open-source browser extension that shows Langfuse traces as a readable conversation. It is an independent project and is not affiliated with Langfuse.

## What LookMeNot reads

- Trace data that the Langfuse page you are viewing loads from its own server (same-origin API responses) or embeds in the page.
- JSON files you upload, or JSON text you paste, into the extension.

## How it is used

Only to display messages, tool calls, tool results and thinking blocks in the LookMeNot pane on that tab.

## What LookMeNot does not do

- It does not collect, transmit, sell or share any data. The extension makes no network requests of its own.
- It has no analytics, telemetry, advertising or crash reporting.
- It does not run remotely hosted code. All code ships inside the extension package.
- It does not store anything. Trace data is held in the memory of the open tab and is discarded when you close or reload it. Reader settings are not saved.

## Permissions

- `https://*.cloud.langfuse.com/*`: opens the pane automatically on Langfuse Cloud pages.
- `activeTab` and `scripting`: after you click the toolbar button, open the pane on the current tab (for self-hosted Langfuse).

## Contact

Questions and support: https://github.com/SunilKumarPradhan/LookMeNot/issues
