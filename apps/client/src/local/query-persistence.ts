import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query';

import { clientVersion } from '../config';
import { loadDocument, removeDocument, saveDocument } from './local-store';
import { isPersistedCacheUsable, isQueryPersistable, queryCacheSchema } from './query-cache-policy';

const WRITE_DELAY_MS = 1000;

let stopActivePersistence: (() => void) | null = null;

export async function restoreQueryCache(client: QueryClient, userId: string): Promise<void> {
  const document = await loadDocument(queryCacheSchema, userId);
  if (document.status === 'empty' || document.status === 'newer') {
    return;
  }
  if (
    document.status === 'unreadable' ||
    !isPersistedCacheUsable(document.data, clientVersion, Date.now())
  ) {
    await removeDocument(queryCacheSchema, userId);
    return;
  }
  hydrate(client, document.data.state);
}

export function startQueryCachePersistence(client: QueryClient, userId: string): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const write = () => {
    timer = undefined;
    const state = dehydrate(client, {
      shouldDehydrateQuery: (query) =>
        isQueryPersistable(query.queryKey, query.state.status === 'success'),
    });
    saveDocument(queryCacheSchema, userId, {
      appVersion: clientVersion,
      savedAt: Date.now(),
      state,
    }).catch(() => undefined);
  };
  const unsubscribe = client.getQueryCache().subscribe(() => {
    timer ??= setTimeout(write, WRITE_DELAY_MS);
  });
  const stop = () => {
    unsubscribe();
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (stopActivePersistence === stop) {
      stopActivePersistence = null;
    }
  };
  stopActivePersistence?.();
  stopActivePersistence = stop;
  return stop;
}

export async function clearQueryCache(client: QueryClient, userId: string): Promise<void> {
  stopActivePersistence?.();
  client.clear();
  await removeDocument(queryCacheSchema, userId);
}
