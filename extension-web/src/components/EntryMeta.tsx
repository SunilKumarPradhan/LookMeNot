import { Copy, Hash } from "lucide-react";
import { useState } from "react";
import type { ChatEntry } from "../core/types";

interface EntryMetaProps {
  entry: ChatEntry;
  onFocusIndex: (index: number) => void;
}

export function EntryMeta({ entry, onFocusIndex }: EntryMetaProps) {
  const [copied, setCopied] = useState(false);

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard permissions vary by page; the reader can continue without it.
    }
  };

  return (
    <div className="entry-meta mono">
      <button type="button" className="meta-button" onClick={() => onFocusIndex(entry.index)} title={`Focus entry ${entry.index}`}>
        <Hash size={12} aria-hidden="true" />
        {entry.index}
      </button>
      <button type="button" className="meta-button" onClick={copyRaw} title="Copy raw entry JSON">
        <Copy size={12} aria-hidden="true" />
        {copied ? "copied" : "raw"}
      </button>
    </div>
  );
}
