import { describe, expect, it } from 'vitest';

import { changedFields } from '../src/sync.ts';

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
