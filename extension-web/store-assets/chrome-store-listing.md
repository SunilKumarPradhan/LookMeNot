# Chrome Web Store Listing Draft

## Name

LookMeNot - Langfuse Trace Reader

## Summary

Visualize Langfuse traces, tool calls, and AI agent actions as a readable conversation pane.

## Category

Developer Tools

## Detailed Description

LookMeNot is an open-source Langfuse trace visualizer that makes AI agent debugging easier by turning raw agent trace JSON into a readable conversation view.

Open a Langfuse trace and LookMeNot appears as a left-side pane. It detects trace payloads from the page, extracts messages, tool calls, tool results, thinking blocks, and observation data, then renders them in chronological order for faster LLM trace inspection.

Features:

- Conversation-style trace reading
- Tool call and tool result cards
- Thinking block visibility controls
- Search across messages, tool names, and tool inputs
- Jump-to-entry navigation
- Expand/collapse controls for long content
- Manual JSON upload and paste fallback
- Toolbar-button support for self-hosted Langfuse instances

Privacy-first behavior:

- Trace content is processed locally in the browser
- No remote analytics
- No third-party data transfer
- No external parser backend
- Open source under the MIT License

## Single Purpose

Display Langfuse trace data as a readable conversation, including messages, tool calls, tool results, and agent actions.

## Permission Justifications

`activeTab`: Allows the user to open LookMeNot on a self-hosted Langfuse page after clicking the extension toolbar icon.

`scripting`: Injects the LookMeNot content script into the active tab after a user action.

Host permission `https://langfuse.com/*` and `https://*.langfuse.com/*`: Lets LookMeNot automatically detect and open on Langfuse Cloud pages.

## Remote Code Declaration

No remote code is executed. The extension bundle contains all runtime JavaScript, CSS, icons, and parser code.

## Data Use Disclosure

Data handled by the extension:

- Website content: Langfuse trace JSON visible to or returned on the active Langfuse page.
- User-provided content: JSON pasted or uploaded by the user.
- Local settings: reader filter preferences.

Data transfer:

- No trace content is transmitted to external servers.
- No analytics provider is used.
- No data is sold or used for advertising.

## Test Instructions

1. Install the extension from the uploaded package.
2. Open a Langfuse trace page on `https://*.langfuse.com/*`, or open a self-hosted Langfuse trace and click the extension toolbar icon.
3. Confirm the LookMeNot left-side pane appears.
4. If automatic capture is not available, click Upload JSON or Paste JSON and provide an `input.json` trace.
5. Verify that messages, tool calls, and tool results render as conversation entries.
6. Test search, filters, expand/collapse, and jump-to-index.

## Support

Support website: `https://github.com/SunilKumarPradhan/LookMeNot/issues`

License: MIT License

## Assets

- Store icon: `store-assets/store-icon-128.png`
- Screenshot: `store-assets/screenshot-1280x800.png`
- Small promo tile: `store-assets/small-promo-440x280.png`
