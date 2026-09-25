import { describe, expect, it } from 'vitest';

import {
  decodeDocument,
  documentKey,
  encodeDocument,
  type LocalSchema,
} from '../src/local/local-document';

interface NotesV3 {
  items: { text: string; pinned: boolean }[];
}

const notesSchema: LocalSchema<NotesV3> = {
  name: 'notes',
  version: 3,
  migrations: {
    1: (data) => ({ items: (data as { texts: string[] }).texts.map((text) => ({ text })) }),
    2: (data) => ({
      items: (data as { items: { text: string }[] }).items.map((item) => ({
        ...item,
        pinned: false,
      })),
    }),
  },
  isValid: (data): data is NotesV3 =>
    typeof data === 'object' && data !== null && Array.isArray((data as NotesV3).items),
};

describe('local documents', () => {
  it('round-trips data at the current schema version', () => {
    const data = { items: [{ text: 'a', pinned: true }] };
    expect(decodeDocument(notesSchema, encodeDocument(notesSchema, data))).toEqual({
      status: 'ready',
      data,
      migrated: false,
    });
  });

  it('applies every migration in order from an older version', () => {
    const raw = JSON.stringify({ schemaVersion: 1, data: { texts: ['a', 'b'] } });
    expect(decodeDocument(notesSchema, raw)).toEqual({
      status: 'ready',
      data: {
        items: [
          { text: 'a', pinned: false },
          { text: 'b', pinned: false },
        ],
      },
      migrated: true,
    });
  });

  it('does not read data written by a newer schema', () => {
    const raw = JSON.stringify({ schemaVersion: 4, data: {} });
    expect(decodeDocument(notesSchema, raw)).toEqual({ status: 'newer', version: 4 });
  });

  it('reports empty and unreadable documents', () => {
    expect(decodeDocument(notesSchema, null)).toEqual({ status: 'empty' });
    for (const raw of ['{', '[]', '{"data":{}}', '{"schemaVersion":0,"data":{}}']) {
      expect(decodeDocument(notesSchema, raw)).toEqual({ status: 'unreadable' });
    }
    const failing = JSON.stringify({ schemaVersion: 1, data: null });
    expect(decodeDocument(notesSchema, failing)).toEqual({ status: 'unreadable' });
    const invalid = JSON.stringify({ schemaVersion: 3, data: { items: 'x' } });
    expect(decodeDocument(notesSchema, invalid)).toEqual({ status: 'unreadable' });
  });

  it('scopes keys by schema and user', () => {
    expect(documentKey(notesSchema, 'user-1')).toBe('personalfin:notes:user-1');
  });
});
