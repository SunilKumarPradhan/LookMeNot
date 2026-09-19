import { useEffect, useState } from "react";

export interface FiltersState {
  showThinking: boolean;
  showToolUse: boolean;
  showToolResult: boolean;
  readingMode: boolean;
}

const STORAGE_KEY = "lookmenot:extension:filters";

const DEFAULT_FILTERS: FiltersState = {
  showThinking: true,
  showToolUse: true,
  showToolResult: true,
  readingMode: false,
};

function loadStoredFilters(): FiltersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function useFilters() {
  const [filters, setFilters] = useState<FiltersState>(loadStoredFilters);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Filter persistence is a nicety; the reader still works without it.
    }
  }, [filters]);

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
