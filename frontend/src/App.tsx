import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { ChatEntry } from "./types";
import { checkHealth, hasBackendApi, parsePastedCapture, parseUploadedFiles, ApiError } from "./api";
import { useFilters } from "./hooks/useFilters";
import { useSearch } from "./hooks/useSearch";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { ChatWindow, type ChatWindowHandle } from "./components/ChatWindow";
import { TopBar } from "./components/TopBar";
import { StatusBar } from "./components/StatusBar";
import type { CollapseSignal } from "./components/bubbleShared";
import type { ParseResult } from "./api";

type LoadState = "loading" | "ready" | "error";
type SourceKind = ParseResult["sourceKind"] | "empty";

const SHORTCUTS = [
  ["/", "Focus search"],
  ["g", "Focus jump-to-index"],
  ["n / N", "Next / previous search hit"],
  ["r", "Toggle reading mode"],
  ["Esc", "Clear search / close this sheet"],
  ["?", "Toggle this cheatsheet"],
];

export default function App() {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedBackend, setUsedBackend] = useState(false);
  const [sourceKind, setSourceKind] = useState<SourceKind>("empty");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(hasBackendApi() ? null : false);

  const [collapseSignal, setCollapseSignal] = useState<CollapseSignal>("auto");
  const [manualOverrides, setManualOverrides] = useState<Set<number>>(new Set());
  const [flashTarget, setFlashTarget] = useState<number | null>(null);
  const [topVisibleIndex, setTopVisibleIndex] = useState<number | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showPastePanel, setShowPastePanel] = useState(false);
  const [pastedInput, setPastedInput] = useState("");
  const [pastedOutput, setPastedOutput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { filters, toggle, isVisible } = useFilters();

  const filteredEntries = useMemo(() => entries.filter((e) => isVisible(e.type)), [entries, filters]);

  const search = useSearch(filteredEntries);

  useEffect(() => {
    if (!hasBackendApi()) return;

    let cancelled = false;
    const poll = () => checkHealth().then((up) => !cancelled && setBackendOnline(up));
    poll();
    const id = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const flashAndScroll = useCallback((index: number) => {
    chatWindowRef.current?.scrollToIndex(index);
    setFlashTarget(index);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashTarget(null), 1000);
  }, []);

  useEffect(() => {
    if (search.currentHit !== null) {
      chatWindowRef.current?.scrollToIndex(search.currentHit);
    }
  }, [search.currentHit]);

  const handleJump = useCallback(
    (index: number) => {
      flashAndScroll(index);
    },
    [flashAndScroll]
  );

  const handleToggleExpand = useCallback((index: number) => {
    setManualOverrides((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const applyParseResult = useCallback((result: ParseResult) => {
    setEntries(result.entries);
    setUsedBackend(result.usedBackend);
    setSourceKind(result.sourceKind);
    setWarnings(result.warnings);
    setCollapseSignal("auto");
    setManualOverrides(new Set());
    setLoadState("ready");
  }, []);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    setLoadState("loading");
    setErrorMessage(null);
    setWarnings([]);
    try {
      applyParseResult(await parseUploadedFiles(files));
    } catch (exc) {
      setErrorMessage(exc instanceof ApiError ? exc.message : "Could not parse that file.");
      setLoadState("error");
    }
  }, [applyParseResult]);

  const handlePasteSubmit = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    setWarnings([]);
    try {
      applyParseResult(await parsePastedCapture(pastedInput, pastedOutput));
      setShowPastePanel(false);
    } catch (exc) {
      setErrorMessage(exc instanceof ApiError ? exc.message : "Could not parse pasted JSON.");
      setLoadState("error");
    }
  }, [applyParseResult, pastedInput, pastedOutput]);

  const handleClearData = useCallback(() => {
    setEntries([]);
    setLoadState("ready");
    setErrorMessage(null);
    setWarnings([]);
    setUsedBackend(false);
    setSourceKind("empty");
    setCollapseSignal("auto");
    setManualOverrides(new Set());
    setFlashTarget(null);
    setTopVisibleIndex(null);
    setPastedInput("");
    setPastedOutput("");
    setShowPastePanel(false);
    search.setQuery("");
  }, [search]);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) handleUploadFiles(files);
    },
    [handleUploadFiles]
  );

  const shortcutHandlers = useMemo(
    () => ({
      focusSearch: () => searchInputRef.current?.focus(),
      focusJump: () => jumpInputRef.current?.focus(),
      nextHit: () => search.next(),
      prevHit: () => search.prev(),
      toggleReadingMode: () => toggle("readingMode"),
      clearAndBlur: () => {
        search.setQuery("");
        setShowCheatsheet(false);
        (document.activeElement as HTMLElement | null)?.blur();
      },
      toggleCheatsheet: () => setShowCheatsheet((v) => !v),
    }),
    [search, toggle]
  );

  useKeyboardShortcuts(shortcutHandlers);

  return (
    <div
      className={`app-shell ${isDragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <TopBar
        filters={filters}
        onToggleFilter={toggle}
        search={search}
        searchInputRef={searchInputRef}
        jumpInputRef={jumpInputRef}
        onJump={handleJump}
        collapseSignal={collapseSignal}
        onSetCollapseSignal={setCollapseSignal}
        onUploadFiles={handleUploadFiles}
        onShowPasteJson={() => setShowPastePanel(true)}
        onClearData={handleClearData}
        onShowCheatsheet={() => setShowCheatsheet((v) => !v)}
      />

      <main className="app-main">
        {loadState === "loading" && <div className="center-state mono">Loading trace…</div>}

        {loadState === "error" && (
          <div className="center-state error-state">
            <p>{errorMessage}</p>
            <p className="text-muted">Drop a raw or pre-parsed JSON file anywhere on this window to try again.</p>
          </div>
        )}

        {loadState === "ready" && entries.length === 0 && <div className="center-state mono">No trace loaded. Upload or paste input JSON to start fresh.</div>}

        {loadState === "ready" && entries.length > 0 && filteredEntries.length === 0 && (
          <div className="center-state mono">All entries are hidden by the current filters.</div>
        )}

        {loadState === "ready" && warnings.length > 0 && (
          <div className="warning-strip mono">{warnings.join(" ")}</div>
        )}

        {loadState === "ready" && filteredEntries.length > 0 && (
          <ChatWindow
            ref={chatWindowRef}
            entries={filteredEntries}
            collapseSignal={collapseSignal}
            manualOverrides={manualOverrides}
            onToggleExpand={handleToggleExpand}
            searchMatches={search.matches}
            searchQuery={search.query}
            activeHit={search.currentHit}
            flashTarget={flashTarget}
            onFocusIndex={flashAndScroll}
            onVisibleRangeChange={setTopVisibleIndex}
            autoScrollBottom
          />
        )}
      </main>

      <StatusBar
        topVisibleIndex={topVisibleIndex}
        totalEntries={filteredEntries.length}
        backendOnline={backendOnline}
        usedBackend={usedBackend}
        sourceKind={sourceKind}
      />

      {isDragging && (
        <div className="dropzone-overlay">
          <div>Drop input/output JSON to load</div>
        </div>
      )}

      {showCheatsheet && (
        <div className="cheatsheet-overlay" onClick={() => setShowCheatsheet(false)}>
          <div className="cheatsheet-card" onClick={(e) => e.stopPropagation()}>
            <h2>Keyboard shortcuts</h2>
            <table>
              <tbody>
                {SHORTCUTS.map(([key, desc]) => (
                  <tr key={key}>
                    <td className="mono">{key}</td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="topbar-btn" onClick={() => setShowCheatsheet(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showPastePanel && (
        <div className="paste-overlay" onClick={() => setShowPastePanel(false)}>
          <div className="paste-card" onClick={(e) => e.stopPropagation()}>
            <div className="paste-card-header">
              <h2>Paste trace JSON</h2>
              <button type="button" className="topbar-btn" onClick={() => setShowPastePanel(false)}>
                Close
              </button>
            </div>
            <label className="paste-field">
              <span>Input JSON</span>
              <textarea value={pastedInput} onChange={(e) => setPastedInput(e.target.value)} spellCheck={false} />
            </label>
            <label className="paste-field">
              <span>Output JSON optional</span>
              <textarea value={pastedOutput} onChange={(e) => setPastedOutput(e.target.value)} spellCheck={false} />
            </label>
            <div className="paste-actions">
              <button type="button" className="topbar-btn" onClick={() => { setPastedInput(""); setPastedOutput(""); }}>
                Clear
              </button>
              <button type="button" className="topbar-btn active" onClick={handlePasteSubmit}>
                Render pasted JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
