import { describe, expect, it } from 'vitest';

import {
  isPersistedCacheUsable,
  isQueryPersistable,
  QUERY_CACHE_MAX_AGE_MS,
  queryCacheSchema,
} from '../src/local/query-cache-policy';

const now = Date.UTC(2026, 8, 25, 12);
const cache = { appVersion: '0.7.0', savedAt: now - 1000, state: { mutations: [], queries: [] } };

describe('query cache policy', () => {
  it('uses a cache saved by the same app version within the maximum age', () => {
    expect(isPersistedCacheUsable(cache, '0.7.0', now)).toBe(true);
    expect(
      isPersistedCacheUsable({ ...cache, savedAt: now - QUERY_CACHE_MAX_AGE_MS }, '0.7.0', now),
    ).toBe(true);
  });

  it('discards caches from another app version, too old, or from the future', () => {
    expect(isPersistedCacheUsable(cache, '0.7.1', now)).toBe(false);
    expect(
      isPersistedCacheUsable({ ...cache, savedAt: now - QUERY_CACHE_MAX_AGE_MS - 1 }, '0.7.0', now),
    ).toBe(false);
    expect(isPersistedCacheUsable({ ...cache, savedAt: now + 1 }, '0.7.0', now)).toBe(false);
  });

  it('persists successful queries except invitation lookups', () => {
    expect(isQueryPersistable(['financial-spaces', 'id', 'transactions'], true)).toBe(true);
    expect(isQueryPersistable(['financial-spaces'], false)).toBe(false);
    expect(isQueryPersistable(['invitations', 'secret-token'], true)).toBe(false);
  });

  it('validates the stored shape', () => {
    expect(queryCacheSchema.isValid(cache)).toBe(true);
    expect(queryCacheSchema.isValid({ ...cache, state: null })).toBe(false);
    expect(queryCacheSchema.isValid({ appVersion: '0.7.0' })).toBe(false);
  });
});
