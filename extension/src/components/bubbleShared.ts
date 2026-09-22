import type { ChatEntry } from "../core/types";

export const LONG_TEXT_THRESHOLD = 400;

export type CollapseSignal = "auto" | "all-expanded" | "all-collapsed";

export interface BubbleCommonProps {
  entry: ChatEntry;
  expanded: boolean;
  onToggleExpand: (index: number) => void;
  searchQuery: string;
  isSearchHit: boolean;
  isActiveHit: boolean;
  flash: boolean;
  onFocusIndex: (index: number) => void;
}

export function isCollapsible(entry: ChatEntry): boolean {
  if (entry.type === "thinking") return true;
  if (entry.type === "tool_result") return entry.text.length > LONG_TEXT_THRESHOLD;
  if (entry.role === "system") return entry.text.length > LONG_TEXT_THRESHOLD;
  if (entry.type === "text") return entry.text.length > 1200;
  return false;
}

function defaultExpanded(entry: ChatEntry): boolean {
  return !isCollapsible(entry);
}

export function computeExpanded(entry: ChatEntry, signal: CollapseSignal, manualOverrides: Set<number>): boolean {
  if (signal === "all-expanded") return true;
  if (signal === "all-collapsed") return !isCollapsible(entry);
  const base = defaultExpanded(entry);
  return manualOverrides.has(entry.index) ? !base : base;
}

export function bubbleClassNames(base: string, props: Pick<BubbleCommonProps, "isSearchHit" | "isActiveHit" | "flash">) {
  return [
    base,
    props.isSearchHit ? "search-hit" : "",
    props.isActiveHit ? "search-hit-active" : "",
    props.flash ? "flash" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
