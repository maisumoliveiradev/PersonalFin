import type { FinancialDate } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import { toSafeAmount } from './dashboard.ts';
import type { DashboardRepository } from './dashboard-repository.ts';

const METRIC_DATE = 'COALESCE(i.reference_month, t.financial_date)';

export function createPostgresDashboardRepository(db: Queryable): DashboardRepository {
  return {
    async monthTotals({ financialSpaceId, start, endExclusive }) {
      const { rows } = await db.query<{
        realized_income: string | null;
        realized_expenses: string | null;
        forecast_income: string | null;
        forecast_expenses: string | null;
      }>(
        `SELECT
           SUM(t.amount_minor) FILTER (WHERE t.type = 'income' AND t.status = 'paid') AS realized_income,
           SUM(t.amount_minor) FILTER (WHERE t.type = 'expense' AND t.status = 'paid') AS realized_expenses,
           SUM(t.amount_minor) FILTER (WHERE t.type = 'income' AND t.status = 'pending') AS forecast_income,
           SUM(t.amount_minor) FILTER (WHERE t.type = 'expense' AND t.status = 'pending') AS forecast_expenses
         FROM financial_transaction t
         LEFT JOIN card_invoice i ON i.id = t.card_invoice_id
         WHERE t.financial_space_id = $1 AND t.deleted_at IS NULL
           AND ${METRIC_DATE} >= $2::date AND ${METRIC_DATE} < $3::date`,
        [financialSpaceId, start, endExclusive],
      );
      const row = rows[0];
      return {
        realizedIncome: toSafeAmount(row?.realized_income ?? null),
        realizedExpenses: toSafeAmount(row?.realized_expenses ?? null),
        forecastIncome: toSafeAmount(row?.forecast_income ?? null),
        forecastExpenses: toSafeAmount(row?.forecast_expenses ?? null),
      };
    },

    async realizedExpensesByCategory({ financialSpaceId, start, endExclusive }) {
      const { rows } = await db.query<{ category_id: string; name: string; amount_minor: string }>(
        `SELECT c.id AS category_id, c.name, SUM(t.amount_minor) AS amount_minor
         FROM financial_transaction t
         JOIN category c ON c.id = t.category_id
         LEFT JOIN card_invoice i ON i.id = t.card_invoice_id
         WHERE t.financial_space_id = $1 AND t.deleted_at IS NULL
           AND t.type = 'expense' AND t.status = 'paid'
           AND ${METRIC_DATE} >= $2::date AND ${METRIC_DATE} < $3::date
         GROUP BY c.id, c.name
         ORDER BY SUM(t.amount_minor) DESC, c.name`,
        [financialSpaceId, start, endExclusive],
      );
      return rows.map((row) => ({
        categoryId: row.category_id,
        name: row.name,
        amountMinor: toSafeAmount(row.amount_minor),
      }));
    },

    async pendingTotals({ financialSpaceId, start, endExclusive }) {
      const { rows } = await db.query<{ income: string | null; expenses: string | null }>(
        `SELECT
           SUM(amount_minor) FILTER (WHERE type = 'income') AS income,
           SUM(amount_minor) FILTER (WHERE type = 'expense') AS expenses
         FROM financial_transaction
         WHERE financial_space_id = $1 AND deleted_at IS NULL AND status = 'pending'
           AND card_invoice_id IS NULL
           AND financial_date >= $2::date AND financial_date < $3::date`,
        [financialSpaceId, start, endExclusive],
      );
      return {
        income: toSafeAmount(rows[0]?.income ?? null),
        expenses: toSafeAmount(rows[0]?.expenses ?? null),
      };
    },

    async projectionComponents(financialSpaceId, observedOn, endExclusive) {
      const { rows } = await db.query<{
        after_income: string | null;
        after_expenses: string | null;
        pending_income: string | null;
        pending_expenses: string | null;
        open_invoices: string | null;
      }>(
        `SELECT
           SUM(amount_minor) FILTER (WHERE type = 'income' AND financial_date > $2::date) AS after_income,
           SUM(amount_minor) FILTER (WHERE type = 'expense' AND financial_date > $2::date) AS after_expenses,
           SUM(amount_minor) FILTER (
             WHERE type = 'income' AND status = 'pending' AND financial_date <= $2::date
           ) AS pending_income,
           SUM(amount_minor) FILTER (
             WHERE type = 'expense' AND status = 'pending' AND financial_date <= $2::date
           ) AS pending_expenses,
           (
             SELECT SUM(p.amount_minor) FROM financial_transaction p
             JOIN card_invoice i ON i.id = p.card_invoice_id
             WHERE p.financial_space_id = $1 AND p.deleted_at IS NULL AND i.due_date < $3::date
           ) AS open_invoices
         FROM financial_transaction
         WHERE financial_space_id = $1 AND deleted_at IS NULL AND financial_date < $3::date
           AND card_invoice_id IS NULL`,
        [financialSpaceId, observedOn, endExclusive],
      );
      const row = rows[0];
      return {
        afterObservation: {
          income: toSafeAmount(row?.after_income ?? null),
          expenses: toSafeAmount(row?.after_expenses ?? null),
        },
        pendingUpToObservation: {
          income: toSafeAmount(row?.pending_income ?? null),
          expenses: toSafeAmount(row?.pending_expenses ?? null),
        },
        openInvoices: toSafeAmount(row?.open_invoices ?? null),
      };
    },

    async observedBalanceBefore(financialSpaceId: string, endExclusive: FinancialDate) {
      const { rows } = await db.query<{ amount_minor: string; observed_on: FinancialDate }>(
        `SELECT amount_minor, observed_on FROM balance_snapshot
         WHERE financial_space_id = $1 AND observed_on < $2::date
         ORDER BY observed_on DESC, recorded_at DESC, id DESC
         LIMIT 1`,
        [financialSpaceId, endExclusive],
      );
      const [row] = rows;
      return row === undefined
        ? null
        : { amountMinor: toSafeAmount(row.amount_minor), observedOn: row.observed_on };
    },
  };
}
