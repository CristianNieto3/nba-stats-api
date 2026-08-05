"use client";

import { useEffect, useState } from "react";
import { searchNames } from "@/lib/api";

/**
 * Debounced name suggestions from /search — up to 10 names. The previous
 * result stays visible while the next one loads so the list doesn't flicker;
 * stale responses are dropped via the effect cleanup.
 */
const EMPTY: string[] = [];

export function useNameSuggestions(query: string) {
  const trimmed = query.trim();
  const [result, setResult] = useState<{ query: string; names: string[] } | null>(null);

  useEffect(() => {
    if (trimmed === "") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchNames(trimmed).then(
        (names) => {
          if (!cancelled) setResult({ query: trimmed, names });
        },
        () => {
          if (!cancelled) setResult({ query: trimmed, names: [] });
        },
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return {
    // Referentially stable across renders so callers can compare identity.
    suggestions: trimmed === "" ? EMPTY : (result?.names ?? EMPTY),
    pending: trimmed !== "" && result?.query !== trimmed,
  };
}
