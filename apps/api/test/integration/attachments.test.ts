import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import {
  addAttachment,
  removeAttachment,
} from '../../src/modules/attachments/attachment-management.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTransaction } from '../../src/modules/transactions/create-transaction.ts';
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

describe('PostgreSQL attachments', () => {
  it('stores bytes exactly, counts active attachments, and keeps removed ones', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
    const categories = await data.repositories.categories.listForSpace(space.id);
    const transaction = await createTransaction(data, {
      financialSpaceId: space.id,
      createdByUserId: userId,
      type: 'expense',
      status: 'paid',
      description: 'Farmácia',
      amountMinor: 1_000,
      financialDate: '2026-10-05',
      categoryId: categories.find((category) => category.defaultKey === 'food')?.id ?? '',
      subcategoryId: null,
    });
    const content = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(2048, 0xab)]);

    const attachment = await addAttachment(data, {
      financialSpaceId: space.id,
      transactionId: transaction.id,
      actorUserId: userId,
      fileName: 'nota fiscal.pdf',
      content,
    });
    expect(attachment.contentType).toBe('application/pdf');
    expect(
      (await data.repositories.attachments.content(space.id, attachment.id))?.equals(content),
    ).toBe(true);
    expect(
      (await data.repositories.transactions.findInSpace(space.id, transaction.id))?.attachmentCount,
    ).toBe(1);

    await removeAttachment(data, {
      financialSpaceId: space.id,
      attachmentId: attachment.id,
      actorUserId: userId,
    });
    expect(
      (await data.repositories.transactions.findInSpace(space.id, transaction.id))?.attachmentCount,
    ).toBe(0);
    const { rows } = await pool.query('SELECT deleted_at FROM attachment WHERE id = $1', [
      attachment.id,
    ]);
    expect(rows[0]?.deleted_at).not.toBeNull();
  });
});
