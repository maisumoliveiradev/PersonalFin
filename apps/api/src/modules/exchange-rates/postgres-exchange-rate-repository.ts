import { type CurrencyCode, normalizeRate } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { RateSource } from '../transactions/transaction.ts';
import type { ExchangeRate, ExchangeRateRepository } from './exchange-rate.ts';

interface RateRow {
  id: string;
  financial_space_id: string;
  currency: CurrencyCode;
  base_currency: CurrencyCode;
  rate_date: string;
  rate: string;
  source: RateSource;
  recorded_at: Date;
}

const COLUMNS = `id, financial_space_id, currency, base_currency,
  to_char(rate_date, 'YYYY-MM-DD') AS rate_date, rate::text AS rate, source, recorded_at`;

function toRate(row: RateRow): ExchangeRate {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    currency: row.currency,
    baseCurrency: row.base_currency,
    rateDate: row.rate_date,
    rate: normalizeRate(row.rate),
    source: row.source,
    recordedAt: row.recorded_at,
  };
}

export function createPostgresExchangeRateRepository(db: Queryable): ExchangeRateRepository {
  return {
    async list(financialSpaceId, currency) {
      const { rows } = await db.query<RateRow>(
        `SELECT ${COLUMNS} FROM exchange_rate
         WHERE financial_space_id = $1 AND ($2::char(3) IS NULL OR currency = $2)
         ORDER BY rate_date DESC, recorded_at DESC, id`,
        [financialSpaceId, currency ?? null],
      );
      return rows.map(toRate);
    },

    async record(rate) {
      const { rows } = await db.query<RateRow>(
        `INSERT INTO exchange_rate (id, financial_space_id, currency, base_currency, rate_date, rate,
           source, recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${COLUMNS}`,
        [
          rate.id,
          rate.financialSpaceId,
          rate.currency,
          rate.baseCurrency,
          rate.rateDate,
          rate.rate,
          rate.source,
          rate.recordedByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Exchange rate insert returned no row');
      }
      return toRate(row);
    },

    async latest(financialSpaceId, currency, onDate) {
      const { rows } = await db.query<RateRow>(
        `SELECT ${COLUMNS} FROM exchange_rate
         WHERE financial_space_id = $1 AND currency = $2 AND rate_date <= $3
         ORDER BY rate_date DESC, recorded_at DESC, id LIMIT 1`,
        [financialSpaceId, currency, onDate],
      );
      const [row] = rows;
      return row === undefined ? null : toRate(row);
    },
  };
}
