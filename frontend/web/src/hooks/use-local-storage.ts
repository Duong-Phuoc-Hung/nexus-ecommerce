'use client';

import { useCallback, useEffect, useState } from 'react';

/** Client preference helper. Authentication tokens should continue using modules/auth/utils/session. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // Keep the in-memory default when storage is disabled or contains invalid JSON.
    } finally {
      setReady(true);
    }
  }, [key]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage can be unavailable; state remains usable for the current page.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, ready] as const;
}
