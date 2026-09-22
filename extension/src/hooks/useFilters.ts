import { useState } from "react";

export interface FiltersState {
  showThinking: boolean;
  showToolUse: boolean;
  showToolResult: boolean;
  readingMode: boolean;
}

const DEFAULT_FILTERS: FiltersState = {
  showThinking: true,
  showToolUse: true,
  showToolResult: true,
  readingMode: false,
};

// Filters live in memory only. The extension never writes to the host page's storage.
export function useFilters() {
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  const toggle = (key: keyof FiltersState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isVisible = (entryType: string) => {
    if (filters.readingMode) return entryType === "text";
    if (entryType === "thinking") return filters.showThinking;
    if (entryType === "tool_use") return filters.showToolUse;
    if (entryType === "tool_result") return filters.showToolResult;
    return true;
  };

  return { filters, toggle, isVisible };
}
