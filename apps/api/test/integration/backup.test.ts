import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { buildBackup, PERSONAL_TABLES, SPACE_TABLES } from '../../src/modules/backup/backup.ts';
import { createDebt, recordDebtPayment } from '../../src/modules/debts/debt-management.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createGoal } from '../../src/modules/goals/goal-management.ts';
import { createImport } from '../../src/modules/imports/import-management.ts';
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

describe('PostgreSQL portable backup', () => {
  it('exports every table of the accessible spaces without file contents', async () => {
    const email = `${randomUUID()}@example.com`;
    const userId = await insertUser(pool, email);
    const space = await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId });
    const categories = await data.repositories.categories.listForSpace(space.id);
    await createTransaction(data, {
      financialSpaceId: space.id,
      createdByUserId: userId,
      type: 'expense',
      status: 'paid',
      description: 'Padaria',
      amountMinor: 99_999_999_999,
      financialDate: '2026-10-05',
      categoryId: categories.find((category) => category.defaultKey === 'food')?.id ?? '',
      subcategoryId: null,
    });
    const { debt } = await createDebt(data, {
      financialSpaceId: space.id,
      actorUserId: userId,
      name: 'Carro',
      originalAmountMinor: 1_000,
      installmentCount: 2,
      firstDueDate: '2026-10-10',
    });
    await recordDebtPayment(data, {
      financialSpaceId: space.id,
      debtId: debt.id,
      actorUserId: userId,
      kind: 'installment',
      amountMinor: 500,
      paidOn: '2026-10-10',
    });
    await createGoal(data, {
      scope: { kind: 'global', ownerUserId: userId },
      actorUserId: userId,
      name: 'Reserva',
      targetAmountMinor: 1_000,
      targetDate: null,
    });
    await createImport(data, {
      financialSpaceId: space.id,
      actorUserId: userId,
      fileName: 'a.csv',
      format: 'csv',
      content: new TextEncoder().encode('a;b\n1;2'),
    });

    const spaces = await data.repositories.financialSpaces.listAccessibleTo(userId);
    const backup = await buildBackup(
      data.repositories.backup,
      { id: userId, name: 'Ana', email },
      spaces,
      new Date('2026-10-31T12:00:00Z'),
    );

    const tables = backup.spaces[0]?.tables ?? {};
    expect(Object.keys(tables).sort()).toEqual([...SPACE_TABLES, ...PERSONAL_TABLES].sort());
    expect(tables.financial_transaction?.[0]).toMatchObject({ amount_minor: 99_999_999_999 });
    expect(tables.category?.length).toBe(categories.length);
    expect(tables.debt_payment).toHaveLength(1);
    expect(tables.import_batch?.[0]).toMatchObject({ file_name: 'a.csv' });
    expect(tables.import_batch?.[0]).not.toHaveProperty('file_content');
    expect(tables.audit_event?.length).toBeGreaterThan(0);
    expect(backup.globalGoals).toMatchObject([{ name: 'Reserva' }]);
    expect(JSON.parse(JSON.stringify(backup))).toEqual(backup);
  });
});
