import { describe, expect, it } from 'vitest';

import { changedFields, reconcileEdit, serverChanges } from '../src/sync.ts';

describe('changed fields', () => {
  it('lists fields whose value differs from the base', () => {
    const base = { description: 'Padaria', amountMinor: 1250, subcategoryId: null };
    expect(changedFields(base, { description: 'Padaria', amountMinor: 1300 })).toEqual([
      'amountMinor',
    ]);
    expect(changedFields(base, { subcategoryId: 'abc', description: 'Pão' })).toEqual([
      'subcategoryId',
      'description',
    ]);
  });

  it('treats missing fields as null', () => {
    expect(changedFields({}, { subcategoryId: null })).toEqual([]);
    expect(changedFields({ tagIds: 'a' }, { tagIds: null })).toEqual(['tagIds']);
  });
});

describe('edit reconciliation (DR-089)', () => {
  const base = { description: 'Aluguel', amountMinor: 100_000, status: 'pending' };

  it('merges fields changed on only one side', () => {
    const local = { description: 'Aluguel outubro' };
    const server = { ...base, amountMinor: 110_000 };
    expect(reconcileEdit(base, local, server)).toEqual({
      kind: 'apply',
      fields: ['description'],
    });
  });

  it('skips local changes the server already has', () => {
    const local = { amountMinor: 110_000 };
    const server = { ...base, amountMinor: 110_000 };
    expect(reconcileEdit(base, local, server)).toEqual({ kind: 'apply', fields: [] });
  });

  it('reports a field changed on both sides to different values', () => {
    const local = { amountMinor: 120_000, status: 'paid' };
    const server = { ...base, amountMinor: 110_000 };
    expect(reconcileEdit(base, local, server)).toEqual({
      kind: 'conflict',
      conflicts: [{ field: 'amountMinor', base: 100_000, local: 120_000, server: 110_000 }],
      independent: ['status'],
    });
  });

  it('lists what the server changed since the base', () => {
    expect(serverChanges(base, { ...base, description: 'Casa' })).toEqual([
      { field: 'description', base: 'Aluguel', local: null, server: 'Casa' },
    ]);
    expect(serverChanges(base, base)).toEqual([]);
  });
});
