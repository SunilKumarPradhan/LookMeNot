import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChatEntry } from "../core/types";
import { MessageBubble } from "./MessageBubble";
import { computeExpanded, type CollapseSignal } from "./bubbleShared";

export interface TraceThreadHandle {
  scrollToIndex: (globalIndex: number) => void;
}

interface TraceThreadProps {
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
}

export const TraceThread = forwardRef<TraceThreadHandle, TraceThreadProps>(function TraceThread(
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
  },
  ref
) {
  const parentRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 104,
    overscan: 8,
  });

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex(globalIndex: number) {
        const pos = entries.findIndex((entry) => entry.index === globalIndex);
        if (pos >= 0) virtualizer.scrollToIndex(pos, { align: "center" });
      },
    }),
    [entries, virtualizer]
  );

  useEffect(() => {
    hasAutoScrolled.current = false;
  }, [entries]);

  useEffect(() => {
    if (!hasAutoScrolled.current && entries.length) {
      virtualizer.scrollToIndex(entries.length - 1, { align: "end" });
      hasAutoScrolled.current = true;
    }
  }, [entries.length, virtualizer]);

  const items = virtualizer.getVirtualItems();
  const topItemIndex = items[0]?.index;

  useEffect(() => {
    if (topItemIndex === undefined) {
      onVisibleRangeChange(null);
      return;
    }
    const topEntry = entries[topItemIndex];
    onVisibleRangeChange(topEntry ? topEntry.index : null);
  }, [topItemIndex, entries, onVisibleRangeChange]);

  const searchHitSet = new Set(searchMatches);

  return (
    <div className="thread-scroll" ref={parentRef}>
      <div className="thread-inner" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const entry = entries[item.index];
          const expanded = computeExpanded(entry, collapseSignal, manualOverrides);
          return (
            <div
              key={entry.index}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="thread-row"
              style={{ transform: `translateY(${item.start}px)` }}
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
