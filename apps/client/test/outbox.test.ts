import type { Transaction } from '@personalfin/api-contract';
import { describe, expect, it } from 'vitest';

import { decodeDocument } from '../src/local/local-document';
import {
  addEntry,
  classifyResponse,
  EMPTY_OUTBOX,
  nextPendingEntry,
  type OutboxEntry,
  outboxSchema,
  removeEntry,
  TransactionAlreadyQueuedError,
  updateEntry,
} from '../src/sync/outbox';
import { changesFromRequest, transactionSyncFields } from '../src/sync/transaction-sync-fields';

const transaction: Transaction = {
  id: 't1',
  type: 'expense',
  status: 'pending',
  description: 'Padaria',
  amountMinor: 1250,
  currency: 'BRL',
  financialDate: '2026-09-25',
  category: { id: 'food', name: 'Alimentação' },
  subcategory: null,
  createdAt: '2026-09-25T10:00:00.000Z',
  version: 3,
  deletedAt: null,
  recurrenceSeriesId: null,
  occurrenceDate: null,
  cardPurchase: null,
  installment: null,
  tags: [
    { id: 'tag-b', name: 'B' },
    { id: 'tag-a', name: 'A' },
  ],
  original: null,
};

function entry(id: string, transactionId: string, state: OutboxEntry['state'] = 'pending') {
  return {
    id,
    spaceId: 's1',
    transactionId,
    operation: { kind: 'delete', baseVersion: 1, base: {} },
    summary: { type: 'expense', description: 'x', amountMinor: 1, financialDate: '2026-09-25' },
    queuedAt: '2026-09-25T10:00:00.000Z',
    state,
    errorCode: null,
    conflict: null,
  } satisfies OutboxEntry;
}

describe('outbox', () => {
  it('keeps one queued change per transaction', () => {
    const outbox = addEntry(EMPTY_OUTBOX, entry('e1', 't1'));
    expect(() => addEntry(outbox, entry('e2', 't1'))).toThrow(TransactionAlreadyQueuedError);
    expect(addEntry(outbox, entry('e2', 't2')).entries.map((item) => item.id)).toEqual([
      'e1',
      'e2',
    ]);
  });

  it('processes pending entries in order, skipping failed and attempted ones', () => {
    let outbox = addEntry(addEntry(EMPTY_OUTBOX, entry('e1', 't1')), entry('e2', 't2'));
    expect(nextPendingEntry(outbox, new Set())?.id).toBe('e1');
    expect(nextPendingEntry(outbox, new Set(['e1']))?.id).toBe('e2');
    outbox = updateEntry(outbox, 'e1', { state: 'error', errorCode: 'CATEGORY_NOT_AVAILABLE' });
    expect(nextPendingEntry(outbox, new Set())?.id).toBe('e2');
    expect(removeEntry(outbox, 'e2').entries.map((item) => item.id)).toEqual(['e1']);
  });

  it('migrates version 1 outboxes by adding an empty conflict', () => {
    const { conflict: _conflict, ...v1Entry } = entry('e1', 't1');
    const raw = JSON.stringify({ schemaVersion: 1, data: { entries: [v1Entry] } });
    expect(decodeDocument(outboxSchema, raw)).toEqual({
      status: 'ready',
      data: { entries: [entry('e1', 't1')] },
      migrated: true,
    });
  });

  it('validates stored outboxes', () => {
    expect(outboxSchema.isValid({ entries: [entry('e1', 't1')] })).toBe(true);
    expect(outboxSchema.isValid({ entries: [{ ...entry('e1', 't1'), state: 'done' }] })).toBe(
      false,
    );
    expect(outboxSchema.isValid({})).toBe(false);
  });

  it('classifies server responses', () => {
    expect(classifyResponse('create', 201, '')).toEqual({ kind: 'done' });
    expect(classifyResponse('create', 200, '')).toEqual({ kind: 'done' });
    expect(classifyResponse('delete', 409, 'TRANSACTION_ALREADY_DELETED')).toEqual({
      kind: 'done',
    });
    expect(classifyResponse('update', 409, 'VERSION_CONFLICT')).toEqual({
      kind: 'conflict',
      code: 'VERSION_CONFLICT',
    });
    expect(classifyResponse('update', 409, 'TRANSACTION_DELETED').kind).toBe('conflict');
    expect(classifyResponse('create', 409, 'TRANSACTION_ID_CONFLICT').kind).toBe('error');
    expect(classifyResponse('create', 422, 'CATEGORY_NOT_AVAILABLE')).toEqual({
      kind: 'error',
      code: 'CATEGORY_NOT_AVAILABLE',
    });
    expect(classifyResponse('update', 503, 'UNKNOWN').kind).toBe('retry-later');
    expect(classifyResponse('update', 401, 'UNAUTHENTICATED').kind).toBe('stop');
    expect(classifyResponse('update', 426, 'CLIENT_UPGRADE_REQUIRED').kind).toBe('stop');
  });
});

describe('transaction sync fields', () => {
  it('describes a transaction with sorted tags and status only outside cards', () => {
    expect(transactionSyncFields(transaction)).toEqual({
      type: 'expense',
      status: 'pending',
      description: 'Padaria',
      amountMinor: 1250,
      financialDate: '2026-09-25',
      categoryId: 'food',
      subcategoryId: null,
      tagIds: 'tag-a,tag-b',
    });
    const purchase = transactionSyncFields({
      ...transaction,
      cardPurchase: {
        cardId: 'c1',
        cardName: 'Nubank',
        invoiceMonth: '2026-10',
        invoiceSettled: false,
      },
    });
    expect(purchase.status).toBeUndefined();
    expect(purchase.invoiceMonth).toBe('2026-10');
  });

  it('keeps only the fields the edit changed', () => {
    const changes = changesFromRequest(transaction, {
      type: 'expense',
      status: 'paid',
      description: 'Padaria',
      amountMinor: 1250,
      financialDate: '2026-09-25',
      categoryId: 'food',
      subcategoryId: null,
      tagIds: ['tag-b', 'tag-a'],
    });
    expect(changes).toEqual({ status: 'paid' });
    expect(
      changesFromRequest(transaction, {
        type: 'expense',
        description: 'Pão',
        amountMinor: 1250,
        financialDate: '2026-09-25',
        categoryId: 'food',
        tagIds: ['tag-a'],
      }),
    ).toEqual({ description: 'Pão', tagIds: ['tag-a'] });
  });
});
