import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import {
  applyMapping,
  confirmImport,
  createImport,
  decideDuplicates,
  undoImport,
} from '../../src/modules/imports/import-management.ts';
import type { ImportMapping } from '../../src/modules/imports/import-model.ts';
import { createMigratedTestPool } from './database.ts';
import { insertUser } from './fixtures.ts';

let pool: DatabasePool;
let data: DataAccess;

beforeAll(async () => {
  pool = await createMigratedTestPool();
  data = createPostgresDataAccess(pool);
});

afterAll(async () => {
  await pool.end();
});

const mapping: ImportMapping = {
  hasHeader: true,
  columns: {
    date: 0,
    description: 1,
    amount: 2,
    type: null,
    category: 3,
    subcategory: null,
    status: null,
  },
  dateFormat: 'YMD',
  decimalSeparator: '.',
  amountSign: 'negative_is_expense',
  fallbackCategoryIds: { expense: null, income: null },
  defaultStatus: 'paid',
};

describe('PostgreSQL imports', () => {
  it('keeps the original file, evaluates rows in bulk, imports, and undoes', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
    const csv = [
      'date,description,amount,category',
      '2026-10-05,Padaria,-12.50,Alimentação',
      '2026-10-05,"Padaria, de novo",-12.50,Alimentação',
      '2026-10-06,Salário,5000,Salário',
      'x,Ruim,1,Salário',
    ].join('\n');
    const content = new TextEncoder().encode(csv);
    const draft = await createImport(data, {
      financialSpaceId: space.id,
      actorUserId: userId,
      fileName: 'extrato.csv',
      format: 'csv',
      content,
    });
    const { rows } = await pool.query<{ file_content: Buffer; file_sha256: string }>(
      'SELECT file_content, file_sha256 FROM import_batch WHERE id = $1',
      [draft.id],
    );
    expect(rows[0]?.file_content.toString('utf8')).toBe(csv);
    expect(rows[0]?.file_sha256).toHaveLength(64);

    const mapped = await applyMapping(data, {
      financialSpaceId: space.id,
      batchId: draft.id,
      expectedVersion: 1,
      mapping,
    });
    expect(await data.repositories.imports.counts(draft.id)).toEqual({
      total: 5,
      valid: 3,
      invalid: 2,
      duplicates: 1,
      undecidedDuplicates: 1,
      toImport: 2,
    });
    const decided = await decideDuplicates(data, {
      financialSpaceId: space.id,
      batchId: draft.id,
      expectedVersion: mapped.version,
      decisions: [{ rowNumber: 3, decision: 'import' }],
    });
    const imported = await confirmImport(data, {
      financialSpaceId: space.id,
      batchId: draft.id,
      actorUserId: userId,
      expectedVersion: decided.version,
    });
    expect(imported).toMatchObject({ status: 'imported', importedCount: 3 });
    const linked = await pool.query(
      'SELECT count(*)::int AS count FROM financial_transaction WHERE import_batch_id = $1',
      [draft.id],
    );
    expect(linked.rows[0]?.count).toBe(3);

    const undone = await undoImport(data, {
      financialSpaceId: space.id,
      batchId: draft.id,
      actorUserId: userId,
      expectedVersion: imported.version,
    });
    expect(undone.status).toBe('undone');
    const active = await pool.query(
      `SELECT count(*)::int AS count FROM financial_transaction
       WHERE import_batch_id = $1 AND deleted_at IS NULL`,
      [draft.id],
    );
    expect(active.rows[0]?.count).toBe(0);
  });
});
