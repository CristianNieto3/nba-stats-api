"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "./api";

type Completed<T> = {
  key: string;
  data: T | null;
  error: ApiRequestError | null;
};

/**
 * Minimal fetch-state hook. Re-runs when `key` changes and keeps the previous
 * data visible while the next result loads, so tables dim instead of flashing
 * a skeleton over existing content.
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>, enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<Completed<T> | null>(null);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Retry bumps `attempt` so the same key can be re-fetched after an error.
  const fullKey = `${key}#${attempt}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetcherRef.current().then(
      (data) => {
        if (!cancelled) setCompleted({ key: fullKey, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          const apiError =
            error instanceof ApiRequestError
              ? error
              : new ApiRequestError(0, "Something went wrong while loading.");
          setCompleted({ key: fullKey, data: null, error: apiError });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [fullKey, enabled]);

  const fresh = completed !== null && completed.key === fullKey;
  const previousData = completed?.data ?? null;

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    data: previousData,
    error: fresh ? (completed?.error ?? null) : null,
    /** True only when there is nothing to show yet — drives skeletons. */
    loading: enabled && !fresh && previousData === null,
    /** True while new data loads behind an existing render — drives dimming. */
    refetching: enabled && !fresh && previousData !== null,
    retry,
  };
}
