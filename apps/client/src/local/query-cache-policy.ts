import type { DehydratedState } from '@tanstack/react-query';

import type { LocalSchema } from './local-document';

export interface PersistedQueryCache {
  appVersion: string;
  savedAt: number;
  state: DehydratedState;
}

export const QUERY_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const NOT_PERSISTED_QUERY_ROOTS: ReadonlySet<string> = new Set(['invitations']);

export const queryCacheSchema: LocalSchema<PersistedQueryCache> = {
  name: 'query-cache',
  version: 1,
  migrations: {},
  isValid: (data): data is PersistedQueryCache => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }
    const candidate = data as Partial<PersistedQueryCache>;
    return (
      typeof candidate.appVersion === 'string' &&
      typeof candidate.savedAt === 'number' &&
      typeof candidate.state === 'object' &&
      candidate.state !== null &&
      Array.isArray(candidate.state.queries)
    );
  },
};

export function isQueryPersistable(queryKey: readonly unknown[], succeeded: boolean): boolean {
  return succeeded && !NOT_PERSISTED_QUERY_ROOTS.has(String(queryKey[0]));
}

export function isPersistedCacheUsable(
  cache: PersistedQueryCache,
  appVersion: string,
  now: number,
): boolean {
  return (
    cache.appVersion === appVersion &&
    cache.savedAt <= now &&
    now - cache.savedAt <= QUERY_CACHE_MAX_AGE_MS
  );
}
