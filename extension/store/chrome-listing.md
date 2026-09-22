# Chrome Web Store Listing

## Name

LookMeNot - Trace Reader for Langfuse

## Summary (132 characters max)

Read Langfuse traces as a conversation: tool calls, results and thinking in a side pane. Local only. Unofficial.

## Category

Developer Tools

## Detailed Description

Use the description in `amo-listing.md` (same text, same "unofficial, not affiliated with Langfuse" line).

## Single Purpose

Display Langfuse trace data as a readable conversation, including messages, tool calls, tool results and agent actions.

## Permission Justifications

`https://*.cloud.langfuse.com/*`: opens the reader automatically on Langfuse Cloud pages.

`activeTab`: lets the user open the reader on a self-hosted Langfuse tab by clicking the toolbar button.

`scripting`: injects the reader into that tab after the click.

## Remote Code Declaration

No remote code is executed. All JavaScript ships in the extension package.

## Data Use Disclosure

- Website content: Langfuse trace JSON that the active Langfuse page loads or embeds, and JSON the user pastes or uploads. Processed locally only.
- Nothing is collected, transmitted, stored, sold or used for advertising.

## Test Instructions

1. Install the package and open any page on `https://cloud.langfuse.com`, or click the toolbar icon on any normal page.
2. Click Upload JSON and choose `test-data/sample-trace.json` (source archive, or https://github.com/SunilKumarPradhan/LookMeNot/blob/main/extension/test-data/sample-trace.json).
3. Verify the 12 entries render, then try search, the filter toggles, expand/collapse and jump-to-entry.

## Support

https://github.com/SunilKumarPradhan/LookMeNot/issues (MIT License)

## Assets

- Store icon: `../public/icons/icon-128.png`
- Small promo tile: `small-promo-440x280.png`
- Screenshot (1280x800): take a real capture of the pane showing `test-data/sample-trace.json`.
