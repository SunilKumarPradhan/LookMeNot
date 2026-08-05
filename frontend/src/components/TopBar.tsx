import { useRef, type ChangeEvent, type FormEvent, type RefObject } from "react";
import type { FiltersState } from "../hooks/useFilters";
import type { useSearch } from "../hooks/useSearch";
import type { CollapseSignal } from "./bubbleShared";

interface TopBarProps {
  filters: FiltersState;
  onToggleFilter: (key: keyof FiltersState) => void;
  search: ReturnType<typeof useSearch>;
  searchInputRef: RefObject<HTMLInputElement>;
  jumpInputRef: RefObject<HTMLInputElement>;
  onJump: (index: number) => void;
  collapseSignal: CollapseSignal;
  onSetCollapseSignal: (signal: CollapseSignal) => void;
  onUploadFiles: (files: File[]) => void;
  onShowPasteJson: () => void;
  onClearData: () => void;
  onShowCheatsheet: () => void;
}

export function TopBar({
  filters,
  onToggleFilter,
  search,
  searchInputRef,
  jumpInputRef,
  onJump,
  collapseSignal,
  onSetCollapseSignal,
  onUploadFiles,
  onShowPasteJson,
  onClearData,
  onShowCheatsheet,
}: TopBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleJumpSubmit = (e: FormEvent) => {
    e.preventDefault();
    const val = jumpInputRef.current?.value ?? "";
    const idx = Number(val);
    if (Number.isFinite(idx)) onJump(idx);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onUploadFiles(files);
    e.target.value = "";
  };

  return (
    <header className="topbar">
      <div className="topbar-title">LookMeNot</div>

      <div className="topbar-group">
        <input
          ref={searchInputRef}
          type="text"
          className="topbar-input search-input"
          placeholder="Search… (/)"
          value={search.query}
          onChange={(e) => search.setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.shiftKey ? search.prev() : search.next();
            }
          }}
        />
        {search.query && (
          <span className="search-counter mono">
            {search.matches.length ? `${search.currentHitDisplayIndex}/${search.matches.length}` : "0/0"}
          </span>
        )}
        <button type="button" className="topbar-btn" onClick={search.prev} disabled={!search.matches.length} aria-label="Previous match">
          ▲
        </button>
        <button type="button" className="topbar-btn" onClick={search.next} disabled={!search.matches.length} aria-label="Next match">
          ▼
        </button>
      </div>

      <form className="topbar-group" onSubmit={handleJumpSubmit}>
        <input ref={jumpInputRef} type="number" className="topbar-input jump-input" placeholder="# (g)" />
        <button type="submit" className="topbar-btn">
          Go
        </button>
      </form>

      <div className="topbar-group">
        <button
          type="button"
          className={`topbar-toggle ${filters.showThinking ? "active" : ""}`}
          onClick={() => onToggleFilter("showThinking")}
          disabled={filters.readingMode}
        >
          THINKING
        </button>
        <button
          type="button"
          className={`topbar-toggle ${filters.showToolUse ? "active" : ""}`}
          onClick={() => onToggleFilter("showToolUse")}
          disabled={filters.readingMode}
        >
          TOOL CALLED
        </button>
        <button
          type="button"
          className={`topbar-toggle ${filters.showToolResult ? "active" : ""}`}
          onClick={() => onToggleFilter("showToolResult")}
          disabled={filters.readingMode}
        >
          RESULT
        </button>
        <button
          type="button"
          className={`topbar-toggle ${filters.readingMode ? "active" : ""}`}
          onClick={() => onToggleFilter("readingMode")}
        >
          📖 Reading mode (r)
        </button>
      </div>

      <div className="topbar-group">
        <button
          type="button"
          className={`topbar-btn ${collapseSignal === "all-expanded" ? "active" : ""}`}
          onClick={() => onSetCollapseSignal(collapseSignal === "all-expanded" ? "auto" : "all-expanded")}
        >
          Expand all
        </button>
        <button
          type="button"
          className={`topbar-btn ${collapseSignal === "all-collapsed" ? "active" : ""}`}
          onClick={() => onSetCollapseSignal(collapseSignal === "all-collapsed" ? "auto" : "all-collapsed")}
        >
          Collapse all
        </button>
      </div>

      <div className="topbar-group topbar-group-end">
        <input ref={fileInputRef} type="file" accept="application/json" multiple hidden onChange={handleFileChange} />
        <button type="button" className="topbar-btn" onClick={() => fileInputRef.current?.click()}>
          Upload input/output JSON
        </button>
        <button type="button" className="topbar-btn" onClick={onShowPasteJson}>
          Paste JSON
        </button>
        <button type="button" className="topbar-btn danger" onClick={onClearData}>
          Clear data
        </button>
        <button type="button" className="topbar-btn" onClick={onShowCheatsheet} aria-label="Keyboard shortcuts">
          ?
        </button>
      </div>
    </header>
  );
}
