import type { DebtPaymentKind } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { Debt, DebtPayment } from './debt.ts';
import type { DebtRepository } from './debt-repository.ts';

interface DebtRow {
  id: string;
  financial_space_id: string;
  name: string;
  original_amount_minor: string;
  currency: string;
  installment_count: number;
  installment_amount_minor: string;
  first_due_date: string;
  archived_at: Date | null;
  created_at: Date;
  version: number;
}

interface DebtPaymentRow {
  id: string;
  debt_id: string;
  financial_space_id: string;
  kind: DebtPaymentKind;
  amount_minor: string;
  paid_on: string;
  recorded_at: Date;
}

const DEBT_COLUMNS = `id, financial_space_id, name, original_amount_minor, currency,
  installment_count, installment_amount_minor, to_char(first_due_date, 'YYYY-MM-DD') AS first_due_date,
  archived_at, created_at, version`;

const PAYMENT_COLUMNS = `id, debt_id, financial_space_id, kind, amount_minor,
  to_char(paid_on, 'YYYY-MM-DD') AS paid_on, recorded_at`;

function toDebt(row: DebtRow): Debt {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    name: row.name,
    originalAmountMinor: Number(row.original_amount_minor),
    currency: row.currency as Debt['currency'],
    installmentCount: row.installment_count,
    installmentAmountMinor: Number(row.installment_amount_minor),
    firstDueDate: row.first_due_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    version: row.version,
  };
}

function toPayment(row: DebtPaymentRow): DebtPayment {
  return {
    id: row.id,
    debtId: row.debt_id,
    financialSpaceId: row.financial_space_id,
    kind: row.kind,
    amountMinor: Number(row.amount_minor),
    paidOn: row.paid_on,
    recordedAt: row.recorded_at,
  };
}

export function createPostgresDebtRepository(db: Queryable): DebtRepository {
  return {
    async listForSpace(financialSpaceId) {
      const { rows } = await db.query<DebtRow>(
        `SELECT ${DEBT_COLUMNS} FROM debt WHERE financial_space_id = $1 ORDER BY created_at, id`,
        [financialSpaceId],
      );
      return rows.map(toDebt);
    },

    async findInSpace(financialSpaceId, debtId, options) {
      const { rows } = await db.query<DebtRow>(
        `SELECT ${DEBT_COLUMNS} FROM debt WHERE financial_space_id = $1 AND id = $2
         ${options?.lock ? 'FOR UPDATE' : ''}`,
        [financialSpaceId, debtId],
      );
      const [row] = rows;
      return row === undefined ? null : toDebt(row);
    },

    async create(debt) {
      const { rows } = await db.query<DebtRow>(
        `INSERT INTO debt (id, financial_space_id, name, original_amount_minor, currency,
           installment_count, installment_amount_minor, first_due_date, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${DEBT_COLUMNS}`,
        [
          debt.id,
          debt.financialSpaceId,
          debt.name,
          String(debt.originalAmountMinor),
          debt.currency,
          debt.installmentCount,
          String(debt.installmentAmountMinor),
          debt.firstDueDate,
          debt.createdByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Debt insert returned no row');
      }
      return toDebt(row);
    },

    async update(update) {
      const { rows } = await db.query<DebtRow>(
        `UPDATE debt SET name = $4, installment_count = $5, installment_amount_minor = $6,
           first_due_date = $7,
           archived_at = CASE WHEN $8 THEN COALESCE(archived_at, now()) ELSE NULL END,
           version = version + 1, updated_at = now()
         WHERE financial_space_id = $1 AND id = $2 AND version = $3
         RETURNING ${DEBT_COLUMNS}`,
        [
          update.financialSpaceId,
          update.debtId,
          update.expectedVersion,
          update.name,
          update.installmentCount,
          String(update.installmentAmountMinor),
          update.firstDueDate,
          update.archived,
        ],
      );
      const [row] = rows;
      return row === undefined ? null : toDebt(row);
    },

    async listPayments(financialSpaceId, debtId) {
      const { rows } = await db.query<DebtPaymentRow>(
        `SELECT ${PAYMENT_COLUMNS} FROM debt_payment
         WHERE financial_space_id = $1 AND deleted_at IS NULL
           AND ($2::uuid IS NULL OR debt_id = $2)
         ORDER BY paid_on, recorded_at, id`,
        [financialSpaceId, debtId ?? null],
      );
      return rows.map(toPayment);
    },

    async recordPayment(payment) {
      const { rows } = await db.query<DebtPaymentRow>(
        `INSERT INTO debt_payment (id, debt_id, financial_space_id, kind, amount_minor, paid_on,
           recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${PAYMENT_COLUMNS}`,
        [
          payment.id,
          payment.debtId,
          payment.financialSpaceId,
          payment.kind,
          String(payment.amountMinor),
          payment.paidOn,
          payment.recordedByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Debt payment insert returned no row');
      }
      return toPayment(row);
    },

    async deletePayment(financialSpaceId, debtId, paymentId, actorUserId) {
      const { rows } = await db.query<DebtPaymentRow>(
        `UPDATE debt_payment SET deleted_at = now(), deleted_by_user_id = $4
         WHERE financial_space_id = $1 AND debt_id = $2 AND id = $3 AND deleted_at IS NULL
         RETURNING ${PAYMENT_COLUMNS}`,
        [financialSpaceId, debtId, paymentId, actorUserId],
      );
      const [row] = rows;
      return row === undefined ? null : toPayment(row);
    },
  };
}
