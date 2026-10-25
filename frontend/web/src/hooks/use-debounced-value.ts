'use client';

import { useEffect, useState } from 'react';

/** Returns a value only after it has stayed unchanged for the given delay. */
export function useDebouncedValue<T>(value: T, delayMs = 500): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), Math.max(0, delayMs));
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
