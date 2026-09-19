# LookMeNot - Open Source Langfuse Trace Visualizer

LookMeNot is an open-source Langfuse trace visualizer and browser extension that turns Langfuse traces into a readable conversation view. Use it as a Langfuse trace viewer for AI agent debugging, tool call inspection, tool result analysis, thinking blocks, observations, and long LLM workflows without digging through nested JSON.

It is privacy-first and built for developers who need to understand what an agent actually did.

## Keywords

Langfuse trace visualizer, Langfuse trace viewer, Langfuse browser extension, AI agent trace viewer, LLM trace visualizer, tool call debugger, agent observability, Langfuse debugging, conversation view for traces.

## Why Use It

- Read Langfuse traces as a clean chat-style timeline.
- Inspect tool calls and tool results without expanding raw JSON by hand.
- Visualize AI agent traces, LLM conversations, observations, and agent actions in chronological order.
- Search across messages, tool names, tool inputs, and outputs.
- Filter thinking blocks, tool calls, and tool results.
- Upload or paste trace JSON when automatic capture is not available.
- Run locally in your browser. No analytics, no remote parser, no trace data sent to LookMeNot servers.

## Use Cases

- Debug Langfuse traces from agentic workflows.
- Review tool calls and tool results from LLM apps.
- Share a readable trace view with teammates without exposing a dashboard account.
- Inspect long conversations and observations from Langfuse Cloud or self-hosted Langfuse.
- Compare raw trace JSON with a human-readable conversation timeline.

## Fastest Start On Windows

Run this in PowerShell:

```powershell
irm https://raw.githubusercontent.com/SunilKumarPradhan/LookMeNot/main/scripts/get-lookmenot.ps1 | iex
```

The script downloads the latest source from GitHub, asks which browser you use, builds the right package, and opens the output folder.

Supported choices:

- Chrome
- Brave
- Edge
- Firefox

Safari is not included yet because Safari extension packaging requires macOS, Xcode, and a separate Apple distribution flow.

## Manual Extension Build

Use this if you prefer to inspect the code before running scripts:

```powershell
git clone https://github.com/SunilKumarPradhan/LookMeNot.git
cd LookMeNot\extension-web
npm install
npm run get-package
```

The package picker asks for your browser and writes files under:

```text
extension-web/dist-packages/
```

Each browser folder includes an `INSTALL.txt` with the exact next steps.

## Browser Packages

Chromium browsers use an unpacked extension folder for local install and a ZIP for store submission:

```text
extension-web/dist-packages/chrome/
extension-web/dist-packages/brave/
extension-web/dist-packages/edge/
extension-web/dist-packages/chromium/
```

Firefox uses a Mozilla Add-ons-ready ZIP:

```text
extension-web/dist-packages/firefox/LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip
```

The Firefox package has been checked with Mozilla's add-on linter with 0 errors, 0 warnings, and 0 notices.

## What LookMeNot Shows

LookMeNot focuses on content, not billing dashboards. It renders:

- User and assistant messages
- Thinking blocks
- Tool calls
- Tool results
- System notices
- Unknown or malformed blocks as safe warning entries

It deliberately avoids sending trace content anywhere. Trace data stays in the browser tab or in local files you choose to load.

## Repository Layout

```text
LookMeNot/
+-- backend/              # Python parser and FastAPI wrapper
+-- frontend/             # Standalone demo viewer
+-- extension-web/        # Browser extension source and packaging scripts
+-- scripts/              # Repo-level helper scripts
+-- sample-raw.json       # Example Langfuse-style trace
+-- sample-parsed.json    # Expected flattened output
```

## Local Development

Install everything for the backend and demo frontend:

```powershell
make install
make up
```

If `make` is not available on Windows, run the pieces manually:

```powershell
python -m pip install -r backend/requirements.txt
cd frontend
npm install
npm run dev
```

In another terminal, run the backend:

```powershell
cd backend
python -m uvicorn server:app --reload --port 8000
```

Develop the browser extension:

```powershell
cd extension-web
npm install
npm run build
npm run get-package
```

## Parser Contract

The backend flattens raw Langfuse-shaped traces into entries like this:

```ts
interface ChatEntry {
  index: number;
  role: "user" | "assistant" | "tool" | "system";
  type: "text" | "thinking" | "tool_use" | "tool_result" | "unknown";
  text: string;
  tool?: string;
  toolInput?: string;
  toolInputRaw?: unknown;
  toolUseId?: string;
  isError?: boolean;
  messageIndex: number;
  rawRole: string;
}
```

One content block becomes one entry. Langfuse often nests `tool_result` blocks inside messages with `role: "user"`; LookMeNot normalizes those entries to `role: "tool"` while preserving the original role in `rawRole`.

## Tests

Run parser tests:

```powershell
cd backend
python -m pytest
```

Run the extension build:

```powershell
cd extension-web
npm run build
```

Run Firefox package validation locally:

```powershell
cd extension-web
npm run package:firefox
npx addons-linter "dist-packages/firefox/LOOKMENOT-FIREFOX-ADDON-NO-WARNINGS-UPLOAD-THIS.zip"
```

## Privacy

LookMeNot processes trace content locally. The extension does not include analytics, telemetry, advertising, a remote parser backend, or third-party trace data transfer.

Permissions are used to detect Langfuse pages, inject the reader after a user action, and render trace content inside the active browser tab.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and pull request guidance.

Use GitHub Issues for support, bugs, and feature requests:

https://github.com/SunilKumarPradhan/LookMeNot/issues

## GitHub Discovery

Recommended repository description:

```text
Open-source Langfuse trace visualizer and browser extension for AI agent debugging, tool calls, tool results, and LLM trace inspection.
```

Recommended GitHub topics:

```text
langfuse, langfuse-trace-viewer, langfuse-visualizer, ai-agent-debugging, llm-observability, trace-viewer, browser-extension, chrome-extension, firefox-extension, developer-tools
```

## Roadmap

- GitHub Releases with prebuilt browser packages.
- Screenshots and short demo clips.
- More parser fixtures for real-world Langfuse edge cases.
- Safari support as a future macOS/Xcode-specific track.

## License

LookMeNot is released under the [MIT License](LICENSE).