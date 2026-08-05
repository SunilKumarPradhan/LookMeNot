import { useMemo, useState } from "react";
import type { ChatEntry } from "../types";

export function useSearch(entries: ChatEntry[]) {
  const [query, setQuery] = useState("");
  const [hitPos, setHitPos] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as number[];
    return entries
      .filter((e) => {
        const haystack = `${e.text} ${e.tool ?? ""} ${e.toolInput ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .map((e) => e.index);
  }, [entries, query]);

  const currentHitIndex = matches.length ? ((hitPos % matches.length) + matches.length) % matches.length : -1;
  const currentHit = currentHitIndex >= 0 ? matches[currentHitIndex] : null;

  const setQueryAndReset = (q: string) => {
    setQuery(q);
    setHitPos(0);
  };

  const next = () => setHitPos((p) => p + 1);
  const prev = () => setHitPos((p) => p - 1);

  return {
    query,
    setQuery: setQueryAndReset,
    matches,
    currentHit,
    currentHitDisplayIndex: currentHitIndex >= 0 ? currentHitIndex + 1 : 0,
    next,
    prev,
  };
}
