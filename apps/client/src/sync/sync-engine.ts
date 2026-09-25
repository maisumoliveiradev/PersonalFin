import { onlineManager } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { apiClient } from '../api/api-client';
import { queryClient } from '../api/query-client';
import { loadDocument, removeDocument, saveDocument } from '../local/local-store';
import {
  addEntry,
  classifyResponse,
  nextPendingEntry,
  type OutboxEntry,
  outboxSchema,
  removeEntry,
  type SyncOutcome,
  updateEntry,
} from './outbox';

export interface SyncSnapshot {
  userId: string | null;
  loaded: boolean;
  blocked: boolean;
  syncing: boolean;
  entries: readonly OutboxEntry[];
  lastSyncedAt: number | null;
}

export type NewOutboxEntry = Omit<OutboxEntry, 'id' | 'queuedAt' | 'state' | 'errorCode'>;

const RETRY_DELAY_MS = 30_000;

const INITIAL_SNAPSHOT: SyncSnapshot = {
  userId: null,
  loaded: false,
  blocked: false,
  syncing: false,
  entries: [],
  lastSyncedAt: null,
};

let snapshot = INITIAL_SNAPSHOT;
const listeners = new Set<() => void>();
let queue: Promise<unknown> = Promise.resolve();
let retryTimer: ReturnType<typeof setTimeout> | undefined;

function setSnapshot(change: Partial<SyncSnapshot>): void {
  snapshot = { ...snapshot, ...change };
  for (const listener of listeners) {
    listener();
  }
}

function serialized<Result>(work: () => Promise<Result>): Promise<Result> {
  const run = queue.then(work, work);
  queue = run.catch(() => undefined);
  return run;
}

export class OfflineChangesUnavailableError extends Error {
  override name = 'OfflineChangesUnavailableError';
}

async function persist(userId: string, entries: OutboxEntry[]): Promise<void> {
  if (snapshot.userId !== userId || snapshot.blocked) {
    throw new OfflineChangesUnavailableError();
  }
  await saveDocument(outboxSchema, userId, { entries });
  setSnapshot({ entries });
}

function change(userId: string, transform: (entries: OutboxEntry[]) => OutboxEntry[]) {
  return serialized(() => persist(userId, transform([...snapshot.entries])));
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: { code?: unknown } }).error;
    if (typeof body?.code === 'string') {
      return body.code;
    }
  }
  return 'UNKNOWN';
}

async function send(entry: OutboxEntry): Promise<SyncOutcome> {
  const path = { spaceId: entry.spaceId, transactionId: entry.transactionId };
  const { operation } = entry;
  if (operation.kind === 'create') {
    const result = await apiClient.POST('/financial-spaces/{spaceId}/transactions', {
      params: { path: { spaceId: entry.spaceId } },
      body: operation.request,
    });
    return classifyResponse('create', result.response.status, errorCode(result.error));
  }
  if (operation.kind === 'update') {
    const result = await apiClient.PATCH(
      '/financial-spaces/{spaceId}/transactions/{transactionId}',
      { params: { path }, body: { ...operation.changes, version: operation.baseVersion } },
    );
    return classifyResponse('update', result.response.status, errorCode(result.error));
  }
  const result = await apiClient.DELETE(
    '/financial-spaces/{spaceId}/transactions/{transactionId}',
    {
      params: { path, query: { version: operation.baseVersion } },
    },
  );
  return classifyResponse('delete', result.response.status, errorCode(result.error));
}

function scheduleRetry(): void {
  if (retryTimer === undefined) {
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      void syncNow();
    }, RETRY_DELAY_MS);
  }
}

export async function syncNow(): Promise<void> {
  const { userId } = snapshot;
  if (userId === null || !snapshot.loaded || snapshot.syncing || !onlineManager.isOnline()) {
    return;
  }
  setSnapshot({ syncing: true });
  const attempted = new Set<string>();
  const changedSpaces = new Set<string>();
  try {
    for (;;) {
      const entry = nextPendingEntry({ entries: [...snapshot.entries] }, attempted);
      if (entry === undefined || snapshot.userId !== userId) {
        break;
      }
      attempted.add(entry.id);
      let outcome: SyncOutcome;
      try {
        outcome = await send(entry);
      } catch {
        break;
      }
      if (outcome.kind === 'done') {
        await change(userId, (entries) => removeEntry({ entries }, entry.id).entries);
        changedSpaces.add(entry.spaceId);
      } else if (outcome.kind === 'error' || outcome.kind === 'conflict') {
        await change(
          userId,
          (entries) =>
            updateEntry({ entries }, entry.id, { state: outcome.kind, errorCode: outcome.code })
              .entries,
        );
      } else {
        if (outcome.kind === 'retry-later') {
          scheduleRetry();
        }
        break;
      }
    }
  } finally {
    if (snapshot.userId === userId) {
      setSnapshot({
        syncing: false,
        ...(changedSpaces.size > 0 ? { lastSyncedAt: Date.now() } : {}),
      });
    }
    for (const spaceId of changedSpaces) {
      void queryClient.invalidateQueries({ queryKey: ['financial-spaces', spaceId] });
    }
  }
}

export async function startSyncEngine(userId: string): Promise<() => void> {
  const document = await loadDocument(outboxSchema, userId).catch(() => null);
  const blocked =
    document === null || document.status === 'newer' || document.status === 'unreadable';
  setSnapshot({
    ...INITIAL_SNAPSHOT,
    userId,
    loaded: true,
    blocked,
    entries: document?.status === 'ready' ? document.data.entries : [],
  });
  if (document?.status === 'ready' && document.migrated) {
    await saveDocument(outboxSchema, userId, document.data).catch(() => undefined);
  }
  const unsubscribe = onlineManager.subscribe((online) => {
    if (online) {
      void syncNow();
    }
  });
  void syncNow();
  return () => {
    unsubscribe();
    if (retryTimer !== undefined) {
      clearTimeout(retryTimer);
      retryTimer = undefined;
    }
    if (snapshot.userId === userId) {
      setSnapshot(INITIAL_SNAPSHOT);
    }
  };
}

function currentUserId(): string {
  if (snapshot.userId === null || snapshot.blocked) {
    throw new OfflineChangesUnavailableError();
  }
  return snapshot.userId;
}

export async function enqueue(entry: NewOutboxEntry): Promise<void> {
  const userId = currentUserId();
  await change(
    userId,
    (entries) =>
      addEntry(
        { entries },
        {
          ...entry,
          id: randomUUID(),
          queuedAt: new Date().toISOString(),
          state: 'pending',
          errorCode: null,
        },
      ).entries,
  );
  void syncNow();
}

export async function discardEntry(entryId: string): Promise<void> {
  await change(currentUserId(), (entries) => removeEntry({ entries }, entryId).entries);
}

export async function retryEntry(entryId: string): Promise<void> {
  await change(
    currentUserId(),
    (entries) => updateEntry({ entries }, entryId, { state: 'pending', errorCode: null }).entries,
  );
  void syncNow();
}

export async function discardAllEntries(userId: string): Promise<void> {
  await serialized(async () => {
    await removeDocument(outboxSchema, userId);
    if (snapshot.userId === userId) {
      setSnapshot({ entries: [] });
    }
  });
}

export function hasQueuedChange(transactionId: string): boolean {
  return snapshot.entries.some((entry) => entry.transactionId === transactionId);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSyncSnapshot(): SyncSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );
}
