import type { Transaction } from '@personalfin/api-contract';
import { reconcileEdit, type SyncResolution, serverChanges } from '@personalfin/domain';
import { onlineManager } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useSyncExternalStore } from 'react';

import { apiClient } from '../api/api-client';
import { queryClient } from '../api/query-client';
import { loadDocument, removeDocument, saveDocument } from '../local/local-store';
import {
  addEntry,
  type ConflictDetail,
  classifyResponse,
  nextPendingEntry,
  type OutboxEntry,
  outboxSchema,
  removeEntry,
  type SyncOutcome,
  updateEntry,
} from './outbox';
import {
  changesSyncFields,
  type TransactionChanges,
  transactionSyncFields,
} from './transaction-sync-fields';

export interface SyncSnapshot {
  userId: string | null;
  loaded: boolean;
  blocked: boolean;
  syncing: boolean;
  entries: readonly OutboxEntry[];
  lastSyncedAt: number | null;
}

export type NewOutboxEntry = Omit<
  OutboxEntry,
  'id' | 'queuedAt' | 'state' | 'errorCode' | 'conflict'
>;

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

type Step = SyncOutcome | { kind: 'conflict-detail'; detail: ConflictDetail };

function transactionPath(entry: OutboxEntry) {
  return { spaceId: entry.spaceId, transactionId: entry.transactionId };
}

async function patchTransaction(
  entry: OutboxEntry,
  changes: TransactionChanges,
  version: number,
  sync?: { resolution: SyncResolution; baseVersion: number },
): Promise<SyncOutcome> {
  const result = await apiClient.PATCH('/financial-spaces/{spaceId}/transactions/{transactionId}', {
    params: { path: transactionPath(entry) },
    body: { ...changes, version, ...(sync === undefined ? {} : { sync }) },
  });
  return classifyResponse('update', result.response.status, errorCode(result.error));
}

async function deleteTransaction(
  entry: OutboxEntry,
  version: number,
  sync?: { resolution: SyncResolution; baseVersion: number },
): Promise<SyncOutcome> {
  const result = await apiClient.DELETE(
    '/financial-spaces/{spaceId}/transactions/{transactionId}',
    {
      params: {
        path: transactionPath(entry),
        query: {
          version,
          ...(sync === undefined
            ? {}
            : { syncResolution: sync.resolution, syncBaseVersion: sync.baseVersion }),
        },
      },
    },
  );
  return classifyResponse('delete', result.response.status, errorCode(result.error));
}

async function send(entry: OutboxEntry): Promise<SyncOutcome> {
  const { operation } = entry;
  if (operation.kind === 'create') {
    const result = await apiClient.POST('/financial-spaces/{spaceId}/transactions', {
      params: { path: { spaceId: entry.spaceId } },
      body: operation.request,
    });
    return classifyResponse('create', result.response.status, errorCode(result.error));
  }
  if (operation.kind === 'update') {
    return patchTransaction(entry, operation.changes, operation.baseVersion);
  }
  return deleteTransaction(entry, operation.baseVersion);
}

async function fetchCurrent(entry: OutboxEntry): Promise<Transaction | SyncOutcome> {
  const result = await apiClient.GET('/financial-spaces/{spaceId}/transactions/{transactionId}', {
    params: { path: transactionPath(entry) },
  });
  if (result.data !== undefined) {
    return result.data;
  }
  return classifyResponse('update', result.response.status, errorCode(result.error));
}

function pick(changes: TransactionChanges, fields: readonly string[]): TransactionChanges {
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    picked[field] = changes[field as keyof TransactionChanges];
  }
  return picked as TransactionChanges;
}

async function reconcile(entry: OutboxEntry): Promise<Step> {
  const { operation } = entry;
  const current = await fetchCurrent(entry);
  if ('kind' in current) {
    return current.kind === 'done' ? { kind: 'error', code: 'UNKNOWN' } : current;
  }
  if (operation.kind === 'update') {
    if (current.deletedAt !== null) {
      return {
        kind: 'conflict-detail',
        detail: { kind: 'edit-deleted', serverVersion: current.version },
      };
    }
    const result = reconcileEdit(
      operation.base,
      changesSyncFields(operation.changes),
      transactionSyncFields(current),
    );
    if (result.kind === 'conflict') {
      return {
        kind: 'conflict-detail',
        detail: {
          kind: 'fields',
          serverVersion: current.version,
          conflicts: result.conflicts,
          independent: result.independent,
        },
      };
    }
    if (result.fields.length === 0) {
      return { kind: 'done' };
    }
    const merged = await patchTransaction(
      entry,
      pick(operation.changes, result.fields),
      current.version,
      { resolution: 'auto_merged', baseVersion: operation.baseVersion },
    );
    return merged.kind === 'conflict' ? { kind: 'retry-later' } : merged;
  }
  if (operation.kind === 'delete') {
    if (current.deletedAt !== null) {
      return { kind: 'done' };
    }
    const changes = serverChanges(operation.base, transactionSyncFields(current));
    if (changes.length > 0) {
      return {
        kind: 'conflict-detail',
        detail: { kind: 'delete-edited', serverVersion: current.version, changes },
      };
    }
    const deleted = await deleteTransaction(entry, current.version, {
      resolution: 'auto_merged',
      baseVersion: operation.baseVersion,
    });
    return deleted.kind === 'conflict' ? { kind: 'retry-later' } : deleted;
  }
  return { kind: 'error', code: 'UNKNOWN' };
}

async function processEntry(entry: OutboxEntry): Promise<Step> {
  const outcome = await send(entry);
  return outcome.kind === 'conflict' ? reconcile(entry) : outcome;
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
      let outcome: Step;
      try {
        outcome = await processEntry(entry);
      } catch {
        break;
      }
      if (outcome.kind === 'done') {
        await change(userId, (entries) => removeEntry({ entries }, entry.id).entries);
        changedSpaces.add(entry.spaceId);
      } else if (outcome.kind === 'conflict-detail') {
        const { detail } = outcome;
        await change(
          userId,
          (entries) =>
            updateEntry({ entries }, entry.id, {
              state: 'conflict',
              errorCode: null,
              conflict: detail,
            }).entries,
        );
      } else if (outcome.kind === 'error' || outcome.kind === 'conflict') {
        await change(
          userId,
          (entries) =>
            updateEntry({ entries }, entry.id, { state: 'error', errorCode: outcome.code }).entries,
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
          conflict: null,
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
    (entries) =>
      updateEntry({ entries }, entryId, { state: 'pending', errorCode: null, conflict: null })
        .entries,
  );
  void syncNow();
}

export type ConflictResolution =
  | { kind: 'fields'; keepLocal: readonly string[] }
  | { kind: 'restore' }
  | { kind: 'delete-anyway' }
  | { kind: 'discard' };

export type ResolutionResult = 'resolved' | 'reopened' | 'failed';

async function applyResolution(
  entry: OutboxEntry,
  conflict: ConflictDetail,
  resolution: ConflictResolution,
): Promise<SyncOutcome> {
  const { operation } = entry;
  if (resolution.kind === 'discard') {
    return { kind: 'done' };
  }
  if (resolution.kind === 'fields' && conflict.kind === 'fields' && operation.kind === 'update') {
    const fields = [...conflict.independent, ...resolution.keepLocal];
    if (fields.length === 0) {
      return { kind: 'done' };
    }
    return patchTransaction(entry, pick(operation.changes, fields), conflict.serverVersion, {
      resolution: 'chose_fields',
      baseVersion: operation.baseVersion,
    });
  }
  if (
    resolution.kind === 'restore' &&
    conflict.kind === 'edit-deleted' &&
    operation.kind === 'update'
  ) {
    const sync = { resolution: 'restored' as const, baseVersion: operation.baseVersion };
    const restored = await apiClient.POST(
      '/financial-spaces/{spaceId}/transactions/{transactionId}/restore',
      { params: { path: transactionPath(entry) }, body: { version: conflict.serverVersion, sync } },
    );
    if (restored.data === undefined) {
      return classifyResponse('update', restored.response.status, errorCode(restored.error));
    }
    return patchTransaction(entry, operation.changes, restored.data.version, sync);
  }
  if (resolution.kind === 'delete-anyway' && conflict.kind === 'delete-edited') {
    return deleteTransaction(entry, conflict.serverVersion, {
      resolution: 'deleted_anyway',
      baseVersion: operation.kind === 'delete' ? operation.baseVersion : conflict.serverVersion,
    });
  }
  return { kind: 'error', code: 'UNKNOWN' };
}

export async function resolveConflict(
  entryId: string,
  resolution: ConflictResolution,
): Promise<ResolutionResult> {
  const userId = currentUserId();
  const entry = snapshot.entries.find((item) => item.id === entryId);
  if (entry === undefined || entry.conflict === null) {
    return 'failed';
  }
  let outcome: SyncOutcome;
  try {
    outcome = await applyResolution(entry, entry.conflict, resolution);
  } catch {
    return 'failed';
  }
  if (outcome.kind === 'done') {
    await change(userId, (entries) => removeEntry({ entries }, entryId).entries);
    setSnapshot({ lastSyncedAt: Date.now() });
    void queryClient.invalidateQueries({ queryKey: ['financial-spaces', entry.spaceId] });
    return 'resolved';
  }
  if (outcome.kind === 'conflict') {
    await change(
      userId,
      (entries) =>
        updateEntry({ entries }, entryId, { state: 'pending', errorCode: null, conflict: null })
          .entries,
    );
    void syncNow();
    return 'reopened';
  }
  if (outcome.kind === 'error') {
    await change(
      userId,
      (entries) =>
        updateEntry({ entries }, entryId, {
          state: 'error',
          errorCode: outcome.code,
          conflict: null,
        }).entries,
    );
  }
  return 'failed';
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
