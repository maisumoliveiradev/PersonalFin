import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPostgresDataAccess, type DataAccess } from '../../src/database/data-access.ts';
import type { DatabasePool } from '../../src/database/pool.ts';
import { InvalidAuditCursorError } from '../../src/modules/audit/audit-repository.ts';
import { createFinancialSpace } from '../../src/modules/financial-spaces/create-financial-space.ts';
import { createTag } from '../../src/modules/tags/tag-management.ts';
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

describe('audit history persistence', () => {
  it('pages through every event of a space exactly once, newest first', async () => {
    const userId = await insertUser(pool, `${randomUUID()}@example.com`);
    const spaceId = (await createFinancialSpace(data, { name: 'Casa', ownerUserId: userId })).id;
    const other = (await createFinancialSpace(data, { name: 'Outra', ownerUserId: userId })).id;
    for (let index = 0; index < 5; index += 1) {
      await createTag(data, {
        financialSpaceId: spaceId,
        actorUserId: userId,
        name: `Tag ${index}`,
      });
    }
    await createTag(data, { financialSpaceId: other, actorUserId: userId, name: 'Alheia' });

    const names: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await data.repositories.audit.listForSpace(spaceId, 2, cursor);
      names.push(...page.items.map((item) => String(item.changes.name?.after)));
      expect(page.items.every((item) => item.actorName === 'Test User')).toBe(true);
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(names).toEqual(['Tag 4', 'Tag 3', 'Tag 2', 'Tag 1', 'Tag 0']);
    await expect(data.repositories.audit.listForSpace(spaceId, 2, 'bad!')).rejects.toBeInstanceOf(
      InvalidAuditCursorError,
    );
  });
});
