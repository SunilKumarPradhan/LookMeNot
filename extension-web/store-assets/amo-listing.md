# Mozilla Add-ons Listing Draft

## Name

LookMeNot - Langfuse Trace Reader

## Summary

Visualize Langfuse traces, tool calls, and AI agent actions as a readable conversation in Firefox.

## Category

Developer Tools

## Description

LookMeNot is an open-source Langfuse trace visualizer that helps developers debug Langfuse observability traces without reading nested JSON by hand.

Open a Langfuse trace and LookMeNot appears as a left-side conversation pane. It detects trace payloads from the page, extracts messages, tool calls, tool results, thinking blocks, and observation data, then renders them in chronological order for faster AI agent and LLM trace inspection.

Features:

- Conversation-style trace reading
- Tool call and tool result cards
- Thinking block visibility controls
- Search across messages, tool names, and tool inputs
- Jump-to-entry navigation
- Expand/collapse controls for long content
- Manual JSON upload and paste fallback
- Toolbar-button support for self-hosted Langfuse instances

Privacy posture:

- Trace content is processed locally in Firefox
- No external parser backend
- No analytics provider
- No trace data sale or advertising use
- Open source under the MIT License

Support website: `https://github.com/SunilKumarPradhan/LookMeNot/issues`

## Reviewer Notes

No test account is required. The add-on can be reviewed with any Langfuse trace export via the manual Upload JSON or Paste JSON flow.

Steps:

1. Install the submitted add-on package.
2. Open a Langfuse trace page on `https://langfuse.com/*` or `https://*.langfuse.com/*`.
3. Confirm the LookMeNot pane appears on the left.
4. For self-hosted Langfuse, open the page and click the toolbar icon.
5. If no trace data is detected automatically, click Upload JSON or Paste JSON and provide an `input.json` trace.
6. Verify messages, tool calls, and tool results render as conversation entries.
7. Test search, filters, expand/collapse, and jump-to-index.

Build/source notes: the source is available under the MIT License at `https://github.com/SunilKumarPradhan/LookMeNot`. The Firefox package is built with `npm run package:firefox`; the generated AMO upload ZIP is `dist-packages/firefox/LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip`.

## Version Notes

Initial Firefox release. Includes the local Langfuse trace reader panel, automatic Langfuse Cloud detection, toolbar activation for self-hosted Langfuse pages, manual JSON upload/paste fallback, search, filters, and expandable tool call/result cards.
