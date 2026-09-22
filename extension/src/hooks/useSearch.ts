import { useMemo, useState } from "react";
import type { ChatEntry } from "../core/types";

export function useSearch(entries: ChatEntry[]) {
  const [query, setQuery] = useState("");
  const [hitPos, setHitPos] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as number[];
    return entries
      .filter((entry) => {
        const haystack = `${entry.text} ${entry.tool ?? ""} ${entry.toolInput ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .map((entry) => entry.index);
  }, [entries, query]);

  const currentHitIndex = matches.length ? ((hitPos % matches.length) + matches.length) % matches.length : -1;
  const currentHit = currentHitIndex >= 0 ? matches[currentHitIndex] : null;

  const setQueryAndReset = (value: string) => {
    setQuery(value);
    setHitPos(0);
  };

  return {
    query,
    setQuery: setQueryAndReset,
    matches,
    currentHit,
    currentHitDisplayIndex: currentHitIndex >= 0 ? currentHitIndex + 1 : 0,
    next: () => setHitPos((pos) => pos + 1),
    prev: () => setHitPos((pos) => pos - 1),
  };
}
