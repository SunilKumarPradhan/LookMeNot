import { EntryMeta } from "./EntryMeta";
import { bubbleClassNames, isCollapsible, type BubbleCommonProps } from "./bubbleShared";
import { HighlightedText } from "./HighlightedText";

export function ToolResultCard({ entry, expanded, onToggleExpand, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex }: BubbleCommonProps) {
  const collapsible = isCollapsible(entry);
  const displayText = collapsible && !expanded ? `${entry.text.slice(0, 300)}…` : entry.text;

  return (
    <div className="chat-row align-left">
      <div className="bubble-col align-left-col">
        <div className={bubbleClassNames(`bubble tool-result${entry.isError ? " is-error" : ""}`, { isSearchHit, isActiveHit, flash })}>
          <div className="bubble-header">
            RESULT: <strong><HighlightedText text={entry.tool ?? "unknown"} query={searchQuery} /></strong>
            <span aria-hidden="true">·</span>
            {entry.isError ? <span className="status-err">⚠️ Error</span> : <span className="status-ok">OK</span>}
          </div>
          <pre className="mono"><HighlightedText text={displayText} query={searchQuery} /></pre>
          {collapsible && (
            <button type="button" className="expand-toggle" onClick={() => onToggleExpand(entry.index)}>
              {expanded ? "▾ show less" : "▸ show more"}
            </button>
          )}
        </div>
        <EntryMeta entry={entry} onFocusIndex={onFocusIndex} />
      </div>
    </div>
  );
}
