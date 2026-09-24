import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { BalanceSnapshot } from './balance-snapshot.ts';
import type { BalanceSnapshotRepository } from './balance-snapshot-repository.ts';

interface BalanceSnapshotRow {
  id: string;
  financial_space_id: string;
  amount_minor: string;
  currency: CurrencyCode;
  observed_on: FinancialDate;
  note: string | null;
  recorded_by_user_id: string;
  recorded_at: Date;
}

const COLUMNS =
  'id, financial_space_id, amount_minor, currency, observed_on, note, recorded_by_user_id, recorded_at';

function toSnapshot(row: BalanceSnapshotRow): BalanceSnapshot {
  const amountMinor = Number(row.amount_minor);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Stored balance exceeds the safe integer range');
  }
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    amountMinor,
    currency: row.currency,
    observedOn: row.observed_on,
    note: row.note,
    recordedByUserId: row.recorded_by_user_id,
    recordedAt: row.recorded_at,
  };
}

export function createPostgresBalanceSnapshotRepository(db: Queryable): BalanceSnapshotRepository {
  return {
    async record(snapshot) {
      const { rows } = await db.query<BalanceSnapshotRow>(
        `INSERT INTO balance_snapshot
           (id, financial_space_id, amount_minor, currency, observed_on, note, recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING ${COLUMNS}`,
        [
          snapshot.id,
          snapshot.financialSpaceId,
          String(snapshot.amountMinor),
          snapshot.currency,
          snapshot.observedOn,
          snapshot.note,
          snapshot.recordedByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Balance snapshot insert returned no row');
      }
      return toSnapshot(row);
    },

    async listForSpace(financialSpaceId, limit) {
      const { rows } = await db.query<BalanceSnapshotRow>(
        `SELECT ${COLUMNS} FROM balance_snapshot
         WHERE financial_space_id = $1
         ORDER BY observed_on DESC, recorded_at DESC, id DESC
         LIMIT $2`,
        [financialSpaceId, limit],
      );
      return rows.map(toSnapshot);
    },
  };
}
