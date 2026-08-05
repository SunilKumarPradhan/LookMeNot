import { useState } from "react";
import type { ChatEntry } from "../types";

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
      // clipboard unavailable — silently ignore
    }
  };

  return (
    <div className="entry-meta mono">
      <button
        type="button"
        className="entry-meta-index"
        onClick={() => onFocusIndex(entry.index)}
        aria-label={`Focus entry ${entry.index}`}
      >
        #{entry.index}
      </button>
      <button type="button" className="entry-meta-copy" onClick={copyRaw} aria-label="Copy raw entry JSON">
        {copied ? "copied" : "copy raw"}
      </button>
    </div>
  );
}
