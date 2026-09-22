import { EntryMeta } from "./EntryMeta";
import { HighlightedText } from "./HighlightedText";
import { Markdown } from "./Markdown";
import { RoleBadge } from "./RoleBadge";
import { SystemNotice } from "./SystemNotice";
import { ThinkingBubble } from "./ThinkingBubble";
import { ToolResultCard } from "./ToolResultCard";
import { ToolUseCard } from "./ToolUseCard";
import { bubbleClassNames, isCollapsible, type BubbleCommonProps } from "./bubbleShared";

export function MessageBubble(props: BubbleCommonProps) {
  const { entry, expanded, onToggleExpand, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex } = props;

  if (entry.type === "thinking") return <ThinkingBubble {...props} />;
  if (entry.type === "tool_use") return <ToolUseCard {...props} />;
  if (entry.type === "tool_result") return <ToolResultCard {...props} />;
  if (entry.role === "system") return <SystemNotice {...props} />;

  if (entry.type === "unknown") {
    return (
      <div className="chat-row align-center">
        <div className="bubble-col align-center-col">
          <div className={bubbleClassNames("bubble unknown-block", { isSearchHit, isActiveHit, flash })}>
            <div className="bubble-header">Unknown block</div>
            <pre className="mono">
              <HighlightedText text={entry.text} query={searchQuery} />
            </pre>
          </div>
          <EntryMeta entry={entry} onFocusIndex={onFocusIndex} />
        </div>
      </div>
    );
  }

  const isAssistant = entry.role === "assistant";
  const align = isAssistant ? "right" : "left";
  const collapsible = isCollapsible(entry);
  const displayText = collapsible && !expanded ? `${entry.text.slice(0, 700)}...` : entry.text;

  return (
    <div className={`chat-row align-${align}`}>
      {!isAssistant && <RoleBadge role="user" />}
      <div className={`bubble-col align-${align}-col`}>
        <div className={bubbleClassNames(`bubble ${isAssistant ? "assistant-text" : "user-text"}`, { isSearchHit, isActiveHit, flash })}>
          <Markdown text={displayText} searchQuery={searchQuery} />
          {collapsible && (
            <button type="button" className="expand-toggle" onClick={() => onToggleExpand(entry.index)}>
              {expanded ? "show less" : "show more"}
            </button>
          )}
        </div>
        <EntryMeta entry={entry} onFocusIndex={onFocusIndex} />
      </div>
      {isAssistant && <RoleBadge role="assistant" />}
    </div>
  );
}
