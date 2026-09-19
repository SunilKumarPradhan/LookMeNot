import { AlertCircle } from "lucide-react";
import { EntryMeta } from "./EntryMeta";
import { HighlightedText } from "./HighlightedText";
import { isCollapsible, type BubbleCommonProps } from "./bubbleShared";

function systemNoticeTitle(text: string) {
  const normalized = text.trim().toLowerCase();
  if (normalized.startsWith("as you answer the user's questions")) return "System Reminder";
  if (normalized.startsWith("this session is being continued")) return "Session Summary";
  if (normalized.startsWith("[system notification")) return "System Notification";
  if (normalized.startsWith("called the")) return "Captured Context";
  if (normalized.startsWith("set effort level")) return "Local Output";
  return "System";
}

export function SystemNotice({ entry, expanded, onToggleExpand, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex }: BubbleCommonProps) {
  const cls = ["system-notice", isSearchHit ? "search-hit" : "", isActiveHit ? "search-hit-active" : "", flash ? "flash" : ""]
    .filter(Boolean)
    .join(" ");
  const collapsible = isCollapsible(entry);
  const displayText = collapsible && !expanded ? `${entry.text.slice(0, 240)}...` : entry.text;

  return (
    <div className="chat-row align-center">
      <div className="bubble-col align-center-col">
        <div className={cls}>
          <div className="system-notice-title">
            <AlertCircle size={13} aria-hidden="true" />
            {systemNoticeTitle(entry.text)}
          </div>
          <pre className="system-notice-text">
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
