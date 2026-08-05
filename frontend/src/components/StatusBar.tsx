interface StatusBarProps {
  topVisibleIndex: number | null;
  totalEntries: number;
  backendOnline: boolean | null;
  usedBackend: boolean;
  sourceKind: string;
}

export function StatusBar({ topVisibleIndex, totalEntries, backendOnline, usedBackend, sourceKind }: StatusBarProps) {
  const backendLabel =
    backendOnline === null ? "Checking backend…" : backendOnline ? "Backend connected" : "Backend offline - browser parser active";
  const parserNote = !usedBackend && sourceKind !== "empty"
    ? sourceKind === "sample" ? "sample parsed in browser" : "parsed in browser"
    : null;

  return (
    <footer className="statusbar mono">
      <span>
        Viewing entry {topVisibleIndex ?? "–"} of {totalEntries}
      </span>
      <span className={`statusbar-chip ${backendOnline ? "ok" : backendOnline === false ? "err" : ""}`}>
        <span className="statusbar-dot" /> {backendLabel}
      </span>
      <span className="statusbar-note">source: {sourceKind}</span>
      {parserNote && <span className="statusbar-note">{parserNote}</span>}
    </footer>
  );
}
