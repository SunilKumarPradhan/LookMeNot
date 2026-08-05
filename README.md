# LookMeNot

Turns a raw Langfuse-style agent trace (nested JSON) into a scrollable chat
thread, so you can debug an agentic workflow by reading it like a
conversation instead of parsing nested JSON by eye.

**Content over metrics.** There are no tokens, cost, or latency numbers
anywhere in this app — only the actual text, thinking, tool calls, and tool
results, in order.

## Architecture

Two tiers, talking over one JSON contract:

- **`backend/`** — a pure-function Python parser (`parse.py`) that flattens
  a raw Langfuse-shaped trace into a flat array of "entries" (one per
  content block), wrapped in a small FastAPI app (`server.py`) exposing it
  over HTTP. Also runnable as a CLI.
- **`frontend/`** — a Vite + React + TypeScript app that renders that flat
  array as chat bubbles. It never sees the raw Langfuse shape — only the
  parsed contract below.

```
design-6-chat-thread/
├── Makefile                  # single-command bring-up
├── sample-raw.json           # example raw Langfuse-style trace
├── sample-parsed.json        # exact expected flattened output for it
├── scripts/
│   └── generate_stress_trace.py  # perf-test fixture generator (~1200 entries)
├── backend/
│   ├── parse.py               # the parser (pure functions + CLI)
│   ├── server.py               # FastAPI wrapper
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api.ts              # 3-tier load fallback (see below)
    │   ├── types.ts             # ChatEntry contract
    │   ├── App.tsx               # top-level state owner
    │   ├── hooks/                # useFilters, useSearch, useKeyboardShortcuts
    │   └── components/           # ChatWindow, TopBar, StatusBar, bubbles
    └── public/
        ├── sample-raw.json
        └── sample-parsed.json
```

## Quickstart

```
make install
make up
```

Brings up the backend (`uvicorn`, port 8000) and frontend (`vite`, port
5173) together; `Ctrl+C` stops both. Run `make install` first to install
both sets of dependencies (`python3 -m pip install ...` for the backend,
`npm install` in `frontend/`).

`make` isn't preinstalled on stock Windows — if you don't have it, run the
two steps it wraps by hand instead:

```
python3 -m pip install --user --break-system-packages -r backend/requirements.txt
cd frontend && npm install

# then, in two terminals:
cd backend  && python3 -m uvicorn server:app --reload --port 8000
cd frontend && npm run dev
```

The frontend works even with the backend down: it falls back to a bundled
pre-parsed sample and to direct upload of already-parsed JSON (see below).

## The parsed entry contract

```ts
interface ChatEntry {
  index: number;        // strictly monotonic, global position
  role: "user" | "assistant" | "tool" | "system";
  type: "text" | "thinking" | "tool_use" | "tool_result" | "unknown";
  text: string;
  tool?: string;         // tool name, for tool_use / tool_result
  toolInput?: string;    // stringified input, for tool_use
  toolInputRaw?: unknown;
  toolUseId?: string;
  isError?: boolean;     // for tool_result
  messageIndex: number;  // which source message this block came from
  rawRole: string;       // the role Langfuse actually gave this block
}
```

One entry per content block — a message with three content blocks becomes
three entries, in order.

### The `tool_result`-as-`"user"` quirk

Langfuse nests `tool_result` blocks inside messages with `role: "user"`.
That's a schema quirk, not the true origin of the content, so the parser
**forces `role: "tool"`** on any `tool_result` entry while preserving the
original value in `rawRole` for verification. Click "copy raw" on any
bubble to see both.

### Other parsing rules

- `tool_use_id → tool name` is resolved by tracking every `tool_use` block
  seen so far; an unmatched `tool_result` (out-of-order or truncated trace)
  gets `tool: "unknown"` rather than failing.
- A message that fails to parse doesn't abort the whole trace — it's
  replaced with a single `unknown`-typed error entry and parsing continues.
- Bare strings inside a `content` array are wrapped as text blocks; a
  missing/malformed `content` becomes an empty block list.

## Frontend behavior

- **3-tier data loading**: upload a raw trace → parsed via the backend →
  rendered; if the backend is unreachable, upload an already-parsed JSON
  array directly; on first load with nothing uploaded, falls back to the
  bundled `sample-raw.json` (parsed via the backend if it's up) or
  `sample-parsed.json` (if it's not).
- **Six bubble treatments**: user/assistant text (left/right, markdown +
  GFM + syntax highlighting), thinking (dashed, italic, collapsible),
  tool_use (right-aligned card), tool_result (left-aligned card, green/red
  by `isError`, collapsible past ~400 chars), system notices (centered
  pill), unknown blocks (dashed warning card, raw text shown as-is).
- **Filters** for thinking / tool_use / tool_result visibility, plus a
  reading mode that shows only `text` entries — persisted to
  `localStorage`.
- **Search** across text/tool name/tool input, with hit count and
  next/prev navigation; **jump to index** by number or by clicking any
  entry's `#N` tag, which scrolls to and briefly flashes that entry.
- **Expand/collapse all**, overridable per-bubble.
- **Keyboard shortcuts**: `/` search, `g` jump, `n`/`N` next/prev hit, `r`
  reading mode, `Esc` clear/close, `?` shortcuts cheatsheet.
- **Virtualized scrolling** (`@tanstack/react-virtual`) — smooth with
  large traces; see `scripts/generate_stress_trace.py` for a ~1200-entry
  stress fixture (already generated at `scripts/stress-raw.json` /
  `stress-parsed.json`, and verified to parse identically via the CLI and
  the API).
- Dark mode only; all transitions are always smoothly animated.

One disclosed simplification versus a literal reading of "highlight
matched substrings inside bubbles": search matches highlight the **whole
bubble** (an outline treatment) rather than injecting `<mark>` into
markdown-rendered text, since the latter would require `rehype-raw` +
`rehype-sanitize` (an XSS-surface tradeoff) for what's otherwise a purely
cosmetic difference.

## Out of scope (explicit)

No automated test suite and no dedicated accessibility work (ARIA audit,
contrast checks, `prefers-reduced-motion`) — both excluded per direction
for this build.
