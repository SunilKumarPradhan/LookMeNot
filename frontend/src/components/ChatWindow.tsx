import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChatEntry } from "../types";
import { MessageBubble } from "./MessageBubble";
import { computeExpanded, type CollapseSignal } from "./bubbleShared";

export interface ChatWindowHandle {
  scrollToIndex: (globalIndex: number) => void;
}

interface ChatWindowProps {
  entries: ChatEntry[];
  collapseSignal: CollapseSignal;
  manualOverrides: Set<number>;
  onToggleExpand: (index: number) => void;
  searchMatches: number[];
  searchQuery: string;
  activeHit: number | null;
  flashTarget: number | null;
  onFocusIndex: (index: number) => void;
  onVisibleRangeChange: (topIndex: number | null) => void;
  autoScrollBottom: boolean;
}

export const ChatWindow = forwardRef<ChatWindowHandle, ChatWindowProps>(function ChatWindow(
  {
    entries,
    collapseSignal,
    manualOverrides,
    onToggleExpand,
    searchMatches,
    searchQuery,
    activeHit,
    flashTarget,
    onFocusIndex,
    onVisibleRangeChange,
    autoScrollBottom,
  },
  ref
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 90,
    overscan: 8,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex(globalIndex: number) {
        const pos = entries.findIndex((e) => e.index === globalIndex);
        if (pos >= 0) {
          virtualizer.scrollToIndex(pos, { align: "center" });
        }
      },
    }),
    [entries, virtualizer]
  );

  useEffect(() => {
    hasAutoScrolled.current = false;
  }, [entries]);

  useEffect(() => {
    if (autoScrollBottom && !hasAutoScrolled.current && entries.length) {
      virtualizer.scrollToIndex(entries.length - 1, { align: "end" });
      hasAutoScrolled.current = true;
    }
  }, [autoScrollBottom, entries.length, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const topItemIndex = items[0]?.index;

  useEffect(() => {
    if (topItemIndex === undefined) {
      onVisibleRangeChange(null);
      return;
    }
    const topEntry = entries[topItemIndex];
    onVisibleRangeChange(topEntry ? topEntry.index : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topItemIndex, entries]);

  const searchHitSet = new Set(searchMatches);

  return (
    <div className="chat-window" ref={parentRef}>
      <div className="chat-window-inner" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((vItem) => {
          const entry = entries[vItem.index];
          const expanded = computeExpanded(entry, collapseSignal, manualOverrides);
          return (
            <div
              key={entry.index}
              ref={virtualizer.measureElement}
              data-index={vItem.index}
              className="chat-window-row"
              style={{ transform: `translateY(${vItem.start}px)` }}
            >
              <MessageBubble
                entry={entry}
                expanded={expanded}
                onToggleExpand={onToggleExpand}
                searchQuery={searchQuery}
                isSearchHit={searchHitSet.has(entry.index)}
                isActiveHit={activeHit === entry.index}
                flash={flashTarget === entry.index}
                onFocusIndex={onFocusIndex}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});
