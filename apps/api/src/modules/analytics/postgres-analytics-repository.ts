import type { Queryable } from '../../database/pool.ts';
import { toSafeAmount } from '../dashboard/dashboard.ts';
import { EFFECTIVE_STATUS, METRIC_DATE, METRIC_JOINS } from '../dashboard/metric-sql.ts';
import type { AnalyticsRepository } from './analytics-repository.ts';

const REALIZED_EXPENSE_IN_RANGE = `t.financial_space_id = $1 AND t.deleted_at IS NULL
           AND t.type = 'expense' AND ${EFFECTIVE_STATUS} = 'paid'
           AND ${METRIC_DATE} >= $2::date AND ${METRIC_DATE} < $3::date`;

export function createPostgresAnalyticsRepository(db: Queryable): AnalyticsRepository {
  return {
    async realizedExpensesByCategory({ financialSpaceId, start, endExclusive }) {
      const { rows } = await db.query<{
        category_id: string;
        category_name: string;
        subcategory_id: string | null;
        subcategory_name: string | null;
        amount_minor: string;
      }>(
        `SELECT c.id AS category_id, c.name AS category_name,
                s.id AS subcategory_id, s.name AS subcategory_name,
                SUM(t.amount_minor) AS amount_minor
         FROM financial_transaction t
         JOIN category c ON c.id = t.category_id
         LEFT JOIN category s ON s.id = t.subcategory_id
         ${METRIC_JOINS}
         WHERE ${REALIZED_EXPENSE_IN_RANGE}
         GROUP BY c.id, c.name, s.id, s.name`,
        [financialSpaceId, start, endExclusive],
      );
      return rows.map((row) => ({
        categoryId: row.category_id,
        categoryName: row.category_name,
        subcategoryId: row.subcategory_id,
        subcategoryName: row.subcategory_name,
        amountMinor: toSafeAmount(row.amount_minor),
      }));
    },

    async realizedExpensesByTag({ financialSpaceId, start, endExclusive }) {
      const { rows } = await db.query<{ tag_id: string; name: string; amount_minor: string }>(
        `SELECT tg.id AS tag_id, tg.name, SUM(t.amount_minor) AS amount_minor
         FROM financial_transaction t
         JOIN transaction_tag tt ON tt.transaction_id = t.id
         JOIN tag tg ON tg.id = tt.tag_id
         ${METRIC_JOINS}
         WHERE ${REALIZED_EXPENSE_IN_RANGE}
         GROUP BY tg.id, tg.name`,
        [financialSpaceId, start, endExclusive],
      );
      return rows.map((row) => ({
        tagId: row.tag_id,
        name: row.name,
        amountMinor: toSafeAmount(row.amount_minor),
      }));
    },
  };
}
