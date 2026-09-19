import { Brain } from "lucide-react";
import { EntryMeta } from "./EntryMeta";
import { HighlightedText } from "./HighlightedText";
import { Markdown } from "./Markdown";
import { bubbleClassNames, type BubbleCommonProps } from "./bubbleShared";

export function ThinkingBubble({ entry, expanded, onToggleExpand, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex }: BubbleCommonProps) {
  const firstLine = entry.text.split("\n")[0];

  return (
    <div className="chat-row align-right">
      <div className="bubble-col align-right-col">
        <div className={bubbleClassNames("bubble thinking", { isSearchHit, isActiveHit, flash })}>
          <div className="bubble-header">
            <Brain size={14} aria-hidden="true" />
            Thinking
          </div>
          {expanded ? (
            <Markdown text={entry.text} searchQuery={searchQuery} />
          ) : (
            <div className="bubble-body-text">
              <HighlightedText text={firstLine} query={searchQuery} />
            </div>
          )}
          <button type="button" className="expand-toggle" onClick={() => onToggleExpand(entry.index)}>
            {expanded ? "collapse" : "expand"}
          </button>
        </div>
        <EntryMeta entry={entry} onFocusIndex={onFocusIndex} />
      </div>
    </div>
  );
}
