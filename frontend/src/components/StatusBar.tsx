interface StatusBarProps {
  topVisibleIndex: number | null;
  totalEntries: number;
  backendOnline: boolean | null;
  usedBackend: boolean;
  sourceKind: string;
}

export function StatusBar({ topVisibleIndex, totalEntries, backendOnline, usedBackend, sourceKind }: StatusBarProps) {
  const backendLabel =
    backendOnline === null ? "Checking optional backend…" : backendOnline ? "Backend connected" : "Browser parser ready";
  const parserNote = !usedBackend && sourceKind !== "empty"
    ? sourceKind === "sample" ? "sample parsed in browser" : "parsed in browser"
    : null;
  const backendClassName = backendOnline ? "ok" : "";

  return (
    <footer className="statusbar mono">
      <span>
        Viewing entry {topVisibleIndex ?? "–"} of {totalEntries}
      </span>
      <span className={`statusbar-chip ${backendClassName}`}>
        <span className="statusbar-dot" /> {backendLabel}
      </span>
      <span className="statusbar-note">source: {sourceKind}</span>
      {parserNote && <span className="statusbar-note">{parserNote}</span>}
    </footer>
  );
}
