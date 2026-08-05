import { EntryMeta } from "./EntryMeta";
import { bubbleClassNames, type BubbleCommonProps } from "./bubbleShared";
import { HighlightedText } from "./HighlightedText";

export function ToolUseCard({ entry, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex }: BubbleCommonProps) {
  return (
    <div className="chat-row align-right">
      <div className="bubble-col align-right-col">
        <div className={bubbleClassNames("bubble tool-use", { isSearchHit, isActiveHit, flash })}>
          <div className="bubble-header">
            TOOL CALLED: <strong><HighlightedText text={entry.tool ?? "unknown"} query={searchQuery} /></strong>
          </div>
          <pre className="mono"><HighlightedText text={entry.toolInput ?? ""} query={searchQuery} /></pre>
        </div>
        <EntryMeta entry={entry} onFocusIndex={onFocusIndex} />
      </div>
    </div>
  );
}
