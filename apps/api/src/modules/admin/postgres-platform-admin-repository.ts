import type { Queryable } from '../../database/pool.ts';
import type { PlatformAdminRepository, PlatformOverview } from './platform-admin.ts';

const RECENT = "now() - interval '30 days'";

const SPACES_USING = {
  cards: 'SELECT count(DISTINCT financial_space_id) FROM card',
  recurrences: 'SELECT count(DISTINCT financial_space_id) FROM recurrence_series',
  debts: 'SELECT count(DISTINCT financial_space_id) FROM debt',
  goals: 'SELECT count(DISTINCT financial_space_id) FROM goal WHERE financial_space_id IS NOT NULL',
  imports: "SELECT count(DISTINCT financial_space_id) FROM import_batch WHERE status = 'imported'",
  attachments: 'SELECT count(DISTINCT financial_space_id) FROM attachment WHERE deleted_at IS NULL',
  foreignCurrency:
    'SELECT count(DISTINCT financial_space_id) FROM financial_transaction WHERE original_currency IS NOT NULL',
  tags: 'SELECT count(DISTINCT financial_space_id) FROM tag',
} as const;

export function createPostgresPlatformAdminRepository(db: Queryable): PlatformAdminRepository {
  const count = async (sql: string): Promise<number> => {
    const { rows } = await db.query<{ count: string }>(`SELECT (${sql}) AS count`);
    return Number(rows[0]?.count ?? 0);
  };
  return {
    async isPlatformAdmin(userId) {
      const { rows } = await db.query('SELECT 1 FROM platform_admin WHERE user_id = $1', [userId]);
      return rows.length === 1;
    },

    async overview(): Promise<PlatformOverview> {
      const adoption = Object.fromEntries(
        await Promise.all(
          Object.entries(SPACES_USING).map(async ([key, sql]) => [key, await count(sql)] as const),
        ),
      ) as PlatformOverview['featureAdoption'];
      const [
        users,
        newUsers,
        activeUsers,
        spaces,
        sharedSpaces,
        newSpaces,
        transactions,
        newTransactions,
        migrations,
      ] = await Promise.all([
        count('SELECT count(*) FROM "user"'),
        count(`SELECT count(*) FROM "user" WHERE "createdAt" >= ${RECENT}`),
        count(`SELECT count(DISTINCT "userId") FROM session WHERE "updatedAt" >= ${RECENT}`),
        count('SELECT count(*) FROM financial_space'),
        count(
          'SELECT count(DISTINCT financial_space_id) FROM financial_space_member WHERE removed_at IS NULL',
        ),
        count(`SELECT count(*) FROM financial_space WHERE created_at >= ${RECENT}`),
        count('SELECT count(*) FROM financial_transaction'),
        count(`SELECT count(*) FROM financial_transaction WHERE created_at >= ${RECENT}`),
        count('SELECT count(*) FROM schema_migrations'),
      ]);
      const { rows } = await db.query<{ id: string }>(
        'SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 1',
      );
      return {
        users: { total: users, createdLast30Days: newUsers, activeLast30Days: activeUsers },
        spaces: { total: spaces, shared: sharedSpaces, createdLast30Days: newSpaces },
        transactions: { total: transactions, createdLast30Days: newTransactions },
        featureAdoption: adoption,
        database: { migrations, latestMigration: rows[0]?.id ?? null },
      };
    },
  };
}
