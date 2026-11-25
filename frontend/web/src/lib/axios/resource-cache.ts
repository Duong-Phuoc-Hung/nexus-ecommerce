/**
 * Session-partitioned in-flight request deduplicator & short-TTL resource cache.
 *
 * Prevents duplicate concurrent GET requests across shared layout/page consumers
 * (e.g. StoreHeader + AccountPage + BuyerReputationPage) while guaranteeing zero
 * cross-session data leakage on logout or account switch.
 */

type CacheEntry<T> = {
  scope: string;
  value: T;
  expiresAt: number;
};

type InFlightEntry<T> = {
  scope: string;
  promise: Promise<T>;
};

const valueCache = new Map<string, CacheEntry<unknown>>();
const inFlightCache = new Map<string, InFlightEntry<unknown>>();

function currentSessionScope(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const token =
      window.sessionStorage.getItem('nexus.accessToken') ||
      window.localStorage.getItem('nexus.accessToken') ||
      '';
    if (!token) return 'anon';
    // Lightweight non-sensitive fingerprint (tail slice of JWT signature)
    return `auth:${token.length}:${token.slice(-16)}`;
  } catch {
    return 'anon';
  }
}

function scopedKey(resourceKey: string, scope: string): string {
  return `${scope}::${resourceKey}`;
}

export async function fetchDeduplicated<T>(
  resourceKey: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    force?: boolean;
    scope?: string;
  },
): Promise<T> {
  const scope = options?.scope ?? currentSessionScope();
  const key = scopedKey(resourceKey, scope);
  const ttlMs = options?.ttlMs ?? 0;
  const now = Date.now();

  if (!options?.force && ttlMs > 0) {
    const cached = valueCache.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.scope === scope && cached.expiresAt > now) {
      return cached.value;
    }
  }

  if (!options?.force) {
    const existing = inFlightCache.get(key) as InFlightEntry<T> | undefined;
    if (existing && existing.scope === scope) {
      return existing.promise;
    }
  }

  let promise!: Promise<T>;
  promise = (async () => {
    try {
      const result = await fetcher();
      // Stale-session protection: only cache if session scope has not changed mid-flight
      const afterScope = options?.scope ?? currentSessionScope();
      if (ttlMs > 0 && afterScope === scope) {
        valueCache.set(key, {
          scope,
          value: result,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return result;
    } finally {
      const current = inFlightCache.get(key);
      if (current?.promise === promise) {
        inFlightCache.delete(key);
      }
    }
  })();

  inFlightCache.set(key, { scope, promise });
  return promise;
}

export function getCachedResource<T>(resourceKey: string, scope?: string): T | null {
  const activeScope = scope ?? currentSessionScope();
  const key = scopedKey(resourceKey, activeScope);
  const cached = valueCache.get(key) as CacheEntry<T> | undefined;
  if (!cached || cached.scope !== activeScope || cached.expiresAt <= Date.now()) {
    return null;
  }
  return cached.value;
}

export function invalidateResource(resourceKeyPrefix: string): void {
  for (const key of valueCache.keys()) {
    const idx = key.indexOf('::');
    const resKey = idx >= 0 ? key.slice(idx + 2) : key;
    if (resKey === resourceKeyPrefix || resKey.startsWith(`${resourceKeyPrefix}:`)) {
      valueCache.delete(key);
    }
  }
  for (const key of inFlightCache.keys()) {
    const idx = key.indexOf('::');
    const resKey = idx >= 0 ? key.slice(idx + 2) : key;
    if (resKey === resourceKeyPrefix || resKey.startsWith(`${resourceKeyPrefix}:`)) {
      inFlightCache.delete(key);
    }
  }
}

export function clearAllResources(): void {
  valueCache.clear();
  inFlightCache.clear();
}
