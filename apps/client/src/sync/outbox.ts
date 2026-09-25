import type { CreateTransactionRequest, TransactionType } from '@personalfin/api-contract';
import type { FieldConflict, SyncFields } from '@personalfin/domain';

import type { LocalSchema } from '../local/local-document';
import type { TransactionChanges } from './transaction-sync-fields';

export interface EntrySummary {
  type: TransactionType;
  description: string;
  amountMinor: number;
  financialDate: string;
}

export type OutboxOperation =
  | { kind: 'create'; request: CreateTransactionRequest & { id: string } }
  | { kind: 'update'; baseVersion: number; base: SyncFields; changes: TransactionChanges }
  | { kind: 'delete'; baseVersion: number; base: SyncFields };

export type OutboxEntryState = 'pending' | 'error' | 'conflict';

export type ConflictDetail =
  | { kind: 'fields'; serverVersion: number; conflicts: FieldConflict[]; independent: string[] }
  | { kind: 'edit-deleted'; serverVersion: number }
  | { kind: 'delete-edited'; serverVersion: number; changes: FieldConflict[] };

export interface OutboxEntry {
  id: string;
  spaceId: string;
  transactionId: string;
  operation: OutboxOperation;
  summary: EntrySummary;
  queuedAt: string;
  state: OutboxEntryState;
  errorCode: string | null;
  conflict: ConflictDetail | null;
}

export interface Outbox {
  entries: OutboxEntry[];
}

export const EMPTY_OUTBOX: Outbox = { entries: [] };

const OPERATION_KINDS = new Set(['create', 'update', 'delete']);
const ENTRY_STATES = new Set(['pending', 'error', 'conflict']);

function isEntry(value: unknown): value is OutboxEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Partial<OutboxEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.spaceId === 'string' &&
    typeof entry.transactionId === 'string' &&
    typeof entry.queuedAt === 'string' &&
    typeof entry.summary === 'object' &&
    entry.summary !== null &&
    typeof entry.operation === 'object' &&
    entry.operation !== null &&
    OPERATION_KINDS.has(entry.operation.kind) &&
    ENTRY_STATES.has(entry.state ?? '') &&
    (entry.conflict === null ||
      (typeof entry.conflict === 'object' && entry.conflict !== undefined))
  );
}

function addConflictField(data: unknown): unknown {
  const { entries } = data as { entries: Record<string, unknown>[] };
  return { entries: entries.map((entry) => ({ ...entry, conflict: null })) };
}

export const outboxSchema: LocalSchema<Outbox> = {
  name: 'outbox',
  version: 2,
  migrations: { 1: addConflictField },
  isValid: (data): data is Outbox =>
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as Outbox).entries) &&
    (data as Outbox).entries.every(isEntry),
};

export function hasEntryFor(outbox: Outbox, transactionId: string): boolean {
  return outbox.entries.some((entry) => entry.transactionId === transactionId);
}

export class TransactionAlreadyQueuedError extends Error {
  override name = 'TransactionAlreadyQueuedError';
}

export function addEntry(outbox: Outbox, entry: OutboxEntry): Outbox {
  if (hasEntryFor(outbox, entry.transactionId)) {
    throw new TransactionAlreadyQueuedError(entry.transactionId);
  }
  return { entries: [...outbox.entries, entry] };
}

export function removeEntry(outbox: Outbox, entryId: string): Outbox {
  return { entries: outbox.entries.filter((entry) => entry.id !== entryId) };
}

export function updateEntry(
  outbox: Outbox,
  entryId: string,
  change: Partial<Pick<OutboxEntry, 'state' | 'errorCode' | 'operation' | 'conflict'>>,
): Outbox {
  return {
    entries: outbox.entries.map((entry) =>
      entry.id === entryId ? { ...entry, ...change } : entry,
    ),
  };
}

export function nextPendingEntry(
  outbox: Outbox,
  skip: ReadonlySet<string>,
): OutboxEntry | undefined {
  return outbox.entries.find((entry) => entry.state === 'pending' && !skip.has(entry.id));
}

export type SyncOutcome =
  | { kind: 'done' }
  | { kind: 'error'; code: string }
  | { kind: 'conflict'; code: string }
  | { kind: 'retry-later' }
  | { kind: 'stop' };

const CONFLICT_CODES = new Set(['VERSION_CONFLICT', 'TRANSACTION_DELETED']);

export function classifyResponse(
  operation: OutboxOperation['kind'],
  status: number,
  code: string,
): SyncOutcome {
  if (status >= 200 && status < 300) {
    return { kind: 'done' };
  }
  if (operation === 'delete' && code === 'TRANSACTION_ALREADY_DELETED') {
    return { kind: 'done' };
  }
  if (status === 401 || status === 426) {
    return { kind: 'stop' };
  }
  if (status >= 500 || status === 429) {
    return { kind: 'retry-later' };
  }
  if (status === 409 && CONFLICT_CODES.has(code) && operation !== 'create') {
    return { kind: 'conflict', code };
  }
  return { kind: 'error', code };
}
