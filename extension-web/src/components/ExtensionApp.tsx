import {
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  FileJson,
  Import,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { detectLangfusePage, discoverCandidates, discoverPageCandidates, mergeCandidates, parseManualJson } from "../core/discovery";
import type { ChatEntry, RawTraceCapture, TraceCandidate } from "../core/types";
import { useFilters } from "../hooks/useFilters";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useSearch } from "../hooks/useSearch";
import { TraceThread, type TraceThreadHandle } from "./TraceThread";
import type { CollapseSignal } from "./bubbleShared";

interface ExtensionAppProps {
  initialOpen: boolean;
  brandIconUrl?: string;
}

interface BridgeMessage {
  source?: string;
  kind?: string;
  url?: string;
  data?: unknown;
  capturedAt?: number;
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function entryCounts(entries: ChatEntry[]) {
  return entries.reduce(
    (counts, entry) => {
      counts.total += 1;
      if (entry.type === "thinking") counts.thinking += 1;
      if (entry.type === "tool_use") counts.toolUse += 1;
      if (entry.type === "tool_result") counts.toolResult += 1;
      return counts;
    },
    { total: 0, thinking: 0, toolUse: 0, toolResult: 0 }
  );
}

function inputFromFiles(files: File[]): { input?: File; output?: File } {
  const output = files.find((file) => /output/i.test(file.name));
  const input = files.find((file) => /input/i.test(file.name)) ?? files.find((file) => file !== output) ?? files[0];
  return { input, output };
}

export function ExtensionApp({ initialOpen, brandIconUrl }: ExtensionAppProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [wasDismissed, setWasDismissed] = useState(false);
  const [isDetected, setIsDetected] = useState(false);
  const [candidates, setCandidates] = useState<TraceCandidate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapseSignal, setCollapseSignal] = useState<CollapseSignal>("auto");
  const [manualOverrides, setManualOverrides] = useState<Set<number>>(new Set());
  const [flashTarget, setFlashTarget] = useState<number | null>(null);
  const [topVisibleIndex, setTopVisibleIndex] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [pastedInput, setPastedInput] = useState("");
  const [pastedOutput, setPastedOutput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  const activeIdRef = useRef<string | null>(null);
  const dismissedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const jumpInputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<TraceThreadHandle>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const { filters, toggle, isVisible } = useFilters();

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    dismissedRef.current = wasDismissed;
  }, [wasDismissed]);

  const activeCandidate = useMemo(() => candidates.find((candidate) => candidate.id === activeId) ?? candidates[0] ?? null, [activeId, candidates]);
  const allEntries = activeCandidate?.entries ?? [];
  const filteredEntries = useMemo(() => allEntries.filter((entry) => isVisible(entry.type)), [allEntries, filters]);
  const counts = useMemo(() => entryCounts(allEntries), [allEntries]);
  const search = useSearch(filteredEntries);

  const applyCandidates = useCallback((incoming: TraceCandidate[]) => {
    if (!incoming.length) return;

    setCandidates((previous) => {
      const merged = mergeCandidates(previous, incoming);
      const currentActive = activeIdRef.current ? merged.find((candidate) => candidate.id === activeIdRef.current) : null;
      const bestIncoming = incoming.sort((a, b) => b.score - a.score || b.capturedAt - a.capturedAt)[0];
      const nextActive = !currentActive || bestIncoming.score >= currentActive.score ? bestIncoming : currentActive;

      if (nextActive && activeIdRef.current !== nextActive.id) {
        activeIdRef.current = nextActive.id;
        setActiveId(nextActive.id);
        setCollapseSignal("auto");
        setManualOverrides(new Set());
      }

      return merged;
    });

    if (!dismissedRef.current) setIsOpen(true);
  }, []);

  const ingestRawCapture = useCallback(
    (capture: RawTraceCapture) => {
      try {
        applyCandidates(discoverCandidates(capture));
      } catch {
        // Ignore payloads that are not trace-shaped.
      }
    },
    [applyCandidates]
  );

  const runPageScan = useCallback(() => {
    const detected = detectLangfusePage();
    setIsDetected(detected);
    if (detected && !dismissedRef.current) setIsOpen(true);
    const pageCandidates = discoverPageCandidates();
    if (pageCandidates.length) applyCandidates(pageCandidates);
    setLastScanAt(Date.now());
  }, [applyCandidates]);

  useEffect(() => {
    const scanSoon = window.setTimeout(runPageScan, 350);
    const scanInterval = window.setInterval(runPageScan, 4500);

    let mutationTimer: number | null = null;
    const observer = new MutationObserver(() => {
      if (mutationTimer !== null) return;
      mutationTimer = window.setTimeout(() => {
        mutationTimer = null;
        runPageScan();
      }, 1200);
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(scanSoon);
      window.clearInterval(scanInterval);
      if (mutationTimer !== null) window.clearTimeout(mutationTimer);
      observer.disconnect();
    };
  }, [runPageScan]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<BridgeMessage>) => {
      if (event.source !== window) return;
      const message = event.data;
      if (!message || typeof message !== "object") return;

      if (message.source === "lookmenot-page-bridge" && "data" in message) {
        ingestRawCapture({
          data: message.data,
          source: message.kind || "network",
          sourceUrl: message.url,
          sourceKind: "network",
          capturedAt: message.capturedAt,
        });
        return;
      }

      if (message.source === "lookmenot-extension" && message.kind === "open-panel") {
        setWasDismissed(false);
        dismissedRef.current = false;
        setIsOpen(true);
        runPageScan();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [ingestRawCapture, runPageScan]);

  const flashAndScroll = useCallback((index: number) => {
    threadRef.current?.scrollToIndex(index);
    setFlashTarget(index);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashTarget(null), 1000);
  }, []);

  useEffect(() => {
    if (search.currentHit !== null) threadRef.current?.scrollToIndex(search.currentHit);
  }, [search.currentHit]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setWasDismissed(true);
  }, []);

  const handleToggleExpand = useCallback((index: number) => {
    setManualOverrides((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const importCandidate = useCallback((candidate: TraceCandidate) => {
    setCandidates((previous) => mergeCandidates(previous, [candidate]));
    setActiveId(candidate.id);
    activeIdRef.current = candidate.id;
    setCollapseSignal("auto");
    setManualOverrides(new Set());
    setShowImport(false);
    setImportError(null);
    setWasDismissed(false);
    setIsOpen(true);
  }, []);

  const handlePasteSubmit = useCallback(() => {
    try {
      importCandidate(parseManualJson(pastedInput, pastedOutput));
    } catch (exc) {
      setImportError(exc instanceof Error ? exc.message : "Could not parse pasted JSON.");
    }
  }, [importCandidate, pastedInput, pastedOutput]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (!files.length) return;

      try {
        const { input, output } = inputFromFiles(files);
        if (!input) throw new Error("Choose an input JSON file.");
        const inputText = await input.text();
        const outputText = output ? await output.text() : "";
        importCandidate(parseManualJson(inputText, outputText));
      } catch (exc) {
        setImportError(exc instanceof Error ? exc.message : "Could not parse uploaded JSON.");
        setShowImport(true);
      }
    },
    [importCandidate]
  );

  const handleJumpSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(jumpInputRef.current?.value ?? "");
    if (Number.isFinite(value)) flashAndScroll(value);
  };

  const handleClear = () => {
    setCandidates([]);
    setActiveId(null);
    activeIdRef.current = null;
    search.setQuery("");
    setManualOverrides(new Set());
    setCollapseSignal("auto");
  };

  useKeyboardShortcuts(isOpen, {
    focusSearch: () => searchInputRef.current?.focus(),
    focusJump: () => jumpInputRef.current?.focus(),
    nextHit: () => search.next(),
    prevHit: () => search.prev(),
    toggleReadingMode: () => toggle("readingMode"),
    closePanel: handleClose,
  });

  return (
    <div className="lookmenot-root">
      {!isOpen && (
        <button
          type="button"
          className={`launcher ${isDetected || candidates.length ? "active" : ""}`}
          onClick={() => {
            setWasDismissed(false);
            dismissedRef.current = false;
            setIsOpen(true);
            runPageScan();
          }}
          title="Open LookMeNot"
        >
          <PanelLeftOpen size={18} aria-hidden="true" />
          <span>LookMeNot</span>
        </button>
      )}

      <aside className={`panel ${isOpen ? "open" : ""}`} aria-label="LookMeNot Langfuse trace reader">
        <header className="panel-header">
          <div className="brand">
            <div className="brand-mark">
              {brandIconUrl ? <img src={brandIconUrl} alt="" /> : "LMN"}
            </div>
            <div>
              <div className="brand-title">LookMeNot</div>
              <div className="brand-subtitle">Langfuse trace reader</div>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="icon-button" onClick={runPageScan} title="Rescan page">
              <RefreshCcw size={16} aria-hidden="true" />
            </button>
            <button type="button" className="icon-button" onClick={handleClose} title="Close pane">
              <PanelLeftClose size={17} aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className="source-strip">
          <div className={`capture-dot ${activeCandidate ? "ok" : isDetected ? "wait" : ""}`} />
          <div className="source-copy">
            <strong>{activeCandidate ? activeCandidate.title : isDetected ? "Listening for trace data" : "Ready"}</strong>
            <span>
              {activeCandidate
                ? `${activeCandidate.subtitle} - ${formatTime(activeCandidate.capturedAt)}`
                : lastScanAt
                  ? `last scan ${formatTime(lastScanAt)}`
                  : "manual import available"}
            </span>
          </div>
        </section>

        <div className="toolbar">
          <label className="select-wrap">
            <span className="sr-only">Trace source</span>
            <select value={activeCandidate?.id ?? ""} onChange={(event) => setActiveId(event.target.value || null)} disabled={!candidates.length}>
              {!candidates.length && <option value="">No trace captured</option>}
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.title} ({candidate.entries.length})
                </option>
              ))}
            </select>
          </label>

          <input ref={fileInputRef} type="file" accept="application/json,.json" multiple hidden onChange={handleFileChange} />
          <button type="button" className="icon-button" onClick={() => fileInputRef.current?.click()} title="Upload JSON">
            <Upload size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" onClick={() => setShowImport(true)} title="Paste JSON">
            <Import size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button danger" onClick={handleClear} title="Clear captured traces" disabled={!candidates.length}>
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="searchbar">
          <Search size={16} aria-hidden="true" />
          <input
            ref={searchInputRef}
            value={search.query}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.shiftKey ? search.prev() : search.next();
              }
            }}
            placeholder="Search"
          />
          {search.query && (
            <span className="search-count mono">
              {search.matches.length ? `${search.currentHitDisplayIndex}/${search.matches.length}` : "0/0"}
            </span>
          )}
          <button type="button" className="icon-button compact" onClick={search.prev} disabled={!search.matches.length} title="Previous match">
            <ChevronUp size={15} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button compact" onClick={search.next} disabled={!search.matches.length} title="Next match">
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="control-row">
          <button
            type="button"
            className={`toggle-chip ${filters.showThinking ? "active" : ""}`}
            onClick={() => toggle("showThinking")}
            disabled={filters.readingMode}
            title="Toggle thinking"
          >
            <Brain size={14} aria-hidden="true" />
            {counts.thinking}
          </button>
          <button
            type="button"
            className={`toggle-chip ${filters.showToolUse ? "active" : ""}`}
            onClick={() => toggle("showToolUse")}
            disabled={filters.readingMode}
            title="Toggle tool calls"
          >
            <Wrench size={14} aria-hidden="true" />
            {counts.toolUse}
          </button>
          <button
            type="button"
            className={`toggle-chip ${filters.showToolResult ? "active" : ""}`}
            onClick={() => toggle("showToolResult")}
            disabled={filters.readingMode}
            title="Toggle tool results"
          >
            <FileJson size={14} aria-hidden="true" />
            {counts.toolResult}
          </button>
          <button
            type="button"
            className={`toggle-chip ${filters.readingMode ? "active" : ""}`}
            onClick={() => toggle("readingMode")}
            title="Reading mode"
          >
            <BookOpen size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`toggle-chip ${collapseSignal === "all-expanded" ? "active" : ""}`}
            onClick={() => setCollapseSignal(collapseSignal === "all-expanded" ? "auto" : "all-expanded")}
            title="Expand all"
          >
            <ChevronsUpDown size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`toggle-chip ${collapseSignal === "all-collapsed" ? "active" : ""}`}
            onClick={() => setCollapseSignal(collapseSignal === "all-collapsed" ? "auto" : "all-collapsed")}
            title="Collapse all"
          >
            <ChevronsDownUp size={14} aria-hidden="true" />
          </button>
          <form className="jump-form" onSubmit={handleJumpSubmit}>
            <input ref={jumpInputRef} type="number" placeholder="#" />
          </form>
        </div>

        {activeCandidate?.warnings.length ? <div className="warning-strip">{activeCandidate.warnings.join(" ")}</div> : null}

        <main className="panel-main">
          {!activeCandidate && (
            <div className="empty-state">
              <FileJson size={28} aria-hidden="true" />
              <strong>{isDetected ? "Waiting for trace data" : "No trace loaded"}</strong>
              <div className="empty-actions">
                <button type="button" className="primary-button" onClick={() => fileInputRef.current?.click()}>
                  Upload JSON
                </button>
                <button type="button" className="secondary-button" onClick={() => setShowImport(true)}>
                  Paste JSON
                </button>
              </div>
            </div>
          )}

          {activeCandidate && filteredEntries.length === 0 && <div className="empty-state">All entries are hidden by the current filters.</div>}

          {activeCandidate && filteredEntries.length > 0 && (
            <TraceThread
              ref={threadRef}
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
            />
          )}
        </main>

        <footer className="panel-footer mono">
          <span>{topVisibleIndex ?? "-"} / {filteredEntries.length || counts.total}</span>
          <span>{candidates.length} source{candidates.length === 1 ? "" : "s"}</span>
          <span>{activeCandidate?.sourceKind ?? "idle"}</span>
        </footer>
      </aside>

      {showImport && (
        <div className="modal-backdrop" onMouseDown={() => setShowImport(false)}>
          <div className="import-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <strong>Import trace JSON</strong>
                <span>input.json plus optional output.json</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setShowImport(false)} title="Close import dialog">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {importError && <div className="import-error">{importError}</div>}
            <label className="import-field">
              <span>Input JSON</span>
              <textarea value={pastedInput} onChange={(event) => setPastedInput(event.target.value)} spellCheck={false} />
            </label>
            <label className="import-field">
              <span>Output JSON</span>
              <textarea value={pastedOutput} onChange={(event) => setPastedOutput(event.target.value)} spellCheck={false} />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setPastedInput("");
                  setPastedOutput("");
                  setImportError(null);
                }}
              >
                Clear
              </button>
              <button type="button" className="primary-button" onClick={handlePasteSubmit}>
                Render
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
