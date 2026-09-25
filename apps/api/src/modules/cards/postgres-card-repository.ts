import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

import { isDatabaseError } from '../../database/database-error.ts';
import type { Queryable } from '../../database/pool.ts';
import type { Card, CardLimitChange } from './card.ts';
import { CardNameTakenError } from './card-errors.ts';
import type { CardRepository } from './card-repository.ts';

interface CardRow {
  id: string;
  financial_space_id: string;
  name: string;
  closing_day: number;
  due_day: number;
  archived_at: Date | null;
  version: number;
}

interface CardLimitChangeRow {
  id: string;
  card_id: string;
  financial_space_id: string;
  amount_minor: string;
  currency: CurrencyCode;
  effective_from: FinancialDate;
  recorded_by_user_id: string;
  recorded_at: Date;
}

const COLUMNS = 'id, financial_space_id, name, closing_day, due_day, archived_at, version';
const LIMIT_COLUMNS =
  'id, card_id, financial_space_id, amount_minor, currency, effective_from, recorded_by_user_id, recorded_at';

function toCard(row: CardRow): Card {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    name: row.name,
    closingDay: row.closing_day,
    dueDay: row.due_day,
    archivedAt: row.archived_at,
    version: row.version,
  };
}

function toLimitChange(row: CardLimitChangeRow): CardLimitChange {
  const amountMinor = Number(row.amount_minor);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Stored card limit exceeds the safe integer range');
  }
  return {
    id: row.id,
    cardId: row.card_id,
    financialSpaceId: row.financial_space_id,
    amountMinor,
    currency: row.currency,
    effectiveFrom: row.effective_from,
    recordedByUserId: row.recorded_by_user_id,
    recordedAt: row.recorded_at,
  };
}

async function translateNameConflict<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (isDatabaseError(error, '23505', 'card_name_unique')) {
      throw new CardNameTakenError();
    }
    throw error;
  }
}

export function createPostgresCardRepository(db: Queryable): CardRepository {
  return {
    async listForSpace(financialSpaceId) {
      const { rows } = await db.query<CardRow>(
        `SELECT ${COLUMNS} FROM card WHERE financial_space_id = $1
         ORDER BY archived_at IS NOT NULL, lower(name), id`,
        [financialSpaceId],
      );
      return rows.map(toCard);
    },

    async findInSpace(financialSpaceId, cardId, options) {
      const lock = options?.lock === true ? 'FOR UPDATE' : '';
      const { rows } = await db.query<CardRow>(
        `SELECT ${COLUMNS} FROM card WHERE financial_space_id = $1 AND id = $2 ${lock}`,
        [financialSpaceId, cardId],
      );
      const [row] = rows;
      return row === undefined ? null : toCard(row);
    },

    async create(card) {
      const { rows } = await translateNameConflict(
        db.query<CardRow>(
          `INSERT INTO card (id, financial_space_id, name, closing_day, due_day, created_by_user_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING ${COLUMNS}`,
          [
            card.id,
            card.financialSpaceId,
            card.name,
            card.closingDay,
            card.dueDay,
            card.createdByUserId,
          ],
        ),
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Card insert returned no row');
      }
      return toCard(row);
    },

    async update({
      financialSpaceId,
      cardId,
      expectedVersion,
      name,
      closingDay,
      dueDay,
      archived,
    }) {
      const { rows } = await translateNameConflict(
        db.query<CardRow>(
          `UPDATE card SET
             name = $4, closing_day = $5, due_day = $6,
             archived_at = CASE WHEN $7::boolean THEN COALESCE(archived_at, now()) ELSE NULL END,
             version = version + 1, updated_at = now()
           WHERE financial_space_id = $1 AND id = $2 AND version = $3
           RETURNING ${COLUMNS}`,
          [financialSpaceId, cardId, expectedVersion, name, closingDay, dueDay, archived],
        ),
      );
      const [row] = rows;
      return row === undefined ? null : toCard(row);
    },

    async recordLimitChange(change) {
      const { rows } = await db.query<CardLimitChangeRow>(
        `INSERT INTO card_limit_change
           (id, card_id, financial_space_id, amount_minor, currency, effective_from, recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${LIMIT_COLUMNS}`,
        [
          change.id,
          change.cardId,
          change.financialSpaceId,
          String(change.amountMinor),
          change.currency,
          change.effectiveFrom,
          change.recordedByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Card limit change insert returned no row');
      }
      return toLimitChange(row);
    },

    async listLimitChanges(financialSpaceId, cardId) {
      const { rows } = await db.query<CardLimitChangeRow>(
        `SELECT ${LIMIT_COLUMNS} FROM card_limit_change
         WHERE financial_space_id = $1 AND ($2::uuid IS NULL OR card_id = $2)
         ORDER BY effective_from DESC, recorded_at DESC, id DESC`,
        [financialSpaceId, cardId ?? null],
      );
      return rows.map(toLimitChange);
    },

    async usedByCard(financialSpaceId) {
      const { rows } = await db.query<{ card_id: string; used_minor: string }>(
        `SELECT i.card_id, SUM(b.total_minor - b.paid_minor) AS used_minor
         FROM card_invoice i JOIN card_invoice_balance b ON b.invoice_id = i.id
         WHERE i.financial_space_id = $1
         GROUP BY i.card_id`,
        [financialSpaceId],
      );
      return new Map(
        rows.map((row) => {
          const used = Number(row.used_minor);
          if (!Number.isSafeInteger(used)) {
            throw new RangeError('Card usage exceeds the safe integer range');
          }
          return [row.card_id, used];
        }),
      );
    },
  };
}
