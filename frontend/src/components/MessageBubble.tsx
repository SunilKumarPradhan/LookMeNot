import { Markdown } from "./Markdown";
import { EntryMeta } from "./EntryMeta";
import { ThinkingBubble } from "./ThinkingBubble";
import { ToolUseCard } from "./ToolUseCard";
import { ToolResultCard } from "./ToolResultCard";
import { SystemNotice } from "./SystemNotice";
import { bubbleClassNames, isCollapsible, type BubbleCommonProps } from "./bubbleShared";
import { HighlightedText } from "./HighlightedText";

function RoleBadge({ role }: { role: "user" | "assistant" }) {
  const isAssistant = role === "assistant";
  return (
    <div className={`role-badge ${role}`} aria-label={isAssistant ? "Claude" : "User"}>
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        {isAssistant ? (
          <path d="M10 2.5l1.3 4.1 4.2 1.4-4.2 1.4-1.3 4.1-1.3-4.1-4.2-1.4 4.2-1.4L10 2.5zm4.2 9.4.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9z" />
        ) : (
          <path d="M10 10a3.6 3.6 0 1 0 0-7.2A3.6 3.6 0 0 0 10 10zm0 1.8c-3.6 0-6.5 1.9-6.5 4.2v.7h13V16c0-2.3-2.9-4.2-6.5-4.2z" />
        )}
      </svg>
      <span>{isAssistant ? "Claude" : "User"}</span>
    </div>
  );
}

export function MessageBubble(props: BubbleCommonProps) {
  const { entry, expanded, onToggleExpand, searchQuery, isSearchHit, isActiveHit, flash, onFocusIndex } = props;

  if (entry.type === "thinking") return <ThinkingBubble {...props} />;
  if (entry.type === "tool_use") return <ToolUseCard {...props} />;
  if (entry.type === "tool_result") return <ToolResultCard {...props} />;
  if (entry.role === "system") return <SystemNotice {...props} />;

  if (entry.type === "unknown") {
    return (
      <div className="chat-row align-center">
        <div className="bubble-col" style={{ alignItems: "center", maxWidth: "90%" }}>
          <div className={bubbleClassNames("bubble unknown-block", { isSearchHit, isActiveHit, flash })}>
            <div className="bubble-header">⚠ Unknown block</div>
            <pre className="mono"><HighlightedText text={entry.text} query={searchQuery} /></pre>
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
