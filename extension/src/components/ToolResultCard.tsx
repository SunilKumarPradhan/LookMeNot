import { CheckCircle2, Terminal, TriangleAlert } from "lucide-react";
import { EntryMeta } from "./EntryMeta";
import { HighlightedText } from "./HighlightedText";
import { bubbleClassNames, isCollapsible, type BubbleCommonProps } from "./bubbleShared";

export function ToolResultCard({ entry, expanded, onToggleExpand, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex }: BubbleCommonProps) {
  const collapsible = isCollapsible(entry);
  const displayText = collapsible && !expanded ? `${entry.text.slice(0, 300)}...` : entry.text;
  const StatusIcon = entry.isError ? TriangleAlert : CheckCircle2;

  return (
    <div className="chat-row align-left">
      <div className="bubble-col align-left-col">
        <div className={bubbleClassNames(`bubble tool-result${entry.isError ? " is-error" : ""}`, { isSearchHit, isActiveHit, flash })}>
          <div className="bubble-header">
            <Terminal size={14} aria-hidden="true" />
            <span>Result</span>
            <strong>
              <HighlightedText text={entry.tool ?? "unknown"} query={searchQuery} />
            </strong>
            <span className={`status-label ${entry.isError ? "status-err" : "status-ok"}`}>
              <StatusIcon size={13} aria-hidden="true" />
              {entry.isError ? "error" : "ok"}
            </span>
          </div>
          <pre className="mono">
            <HighlightedText text={displayText} query={searchQuery} />
          </pre>
          {collapsible && (
            <button type="button" className="expand-toggle" onClick={() => onToggleExpand(entry.index)}>
              {expanded ? "show less" : "show more"}
            </button>
          )}
        </div>
        <EntryMeta entry={entry} onFocusIndex={onFocusIndex} />
      </div>
    </div>
  );
}
