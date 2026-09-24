import type {
  CurrencyCode,
  FinancialDate,
  NonBusinessDayRule,
  RecurrenceFrequency,
  TransactionType,
} from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { RecurrenceRepository } from './recurrence-repository.ts';
import type { RecurrenceSeries } from './recurrence-series.ts';

interface SeriesRow {
  id: string;
  financial_space_id: string;
  type: TransactionType;
  description: string;
  amount_minor: string;
  currency: CurrencyCode;
  category_id: string;
  subcategory_id: string | null;
  frequency: RecurrenceFrequency;
  non_business_day_rule: NonBusinessDayRule;
  start_date: FinancialDate;
  end_date: FinancialDate | null;
  materialized_through: FinancialDate | null;
  created_by_user_id: string;
  version: number;
}

const COLUMNS = `id, financial_space_id, type, description, amount_minor, currency, category_id,
  subcategory_id, frequency, non_business_day_rule, start_date, end_date, materialized_through,
  created_by_user_id, version`;

function toSeries(row: SeriesRow): RecurrenceSeries {
  const amountMinor = Number(row.amount_minor);
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Stored amount exceeds the safe integer range');
  }
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    type: row.type,
    description: row.description,
    amountMinor,
    currency: row.currency,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    frequency: row.frequency,
    nonBusinessDayRule: row.non_business_day_rule,
    startDate: row.start_date,
    endDate: row.end_date,
    materializedThrough: row.materialized_through,
    createdByUserId: row.created_by_user_id,
    version: row.version,
  };
}

export function createPostgresRecurrenceRepository(db: Queryable): RecurrenceRepository {
  return {
    async create(series) {
      const { rows } = await db.query<SeriesRow>(
        `INSERT INTO recurrence_series (
           id, financial_space_id, type, description, amount_minor, currency, category_id,
           subcategory_id, frequency, non_business_day_rule, start_date, end_date, created_by_user_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${COLUMNS}`,
        [
          series.id,
          series.financialSpaceId,
          series.type,
          series.description,
          String(series.amountMinor),
          series.currency,
          series.categoryId,
          series.subcategoryId,
          series.frequency,
          series.nonBusinessDayRule,
          series.startDate,
          series.endDate,
          series.createdByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Recurrence series insert returned no row');
      }
      return toSeries(row);
    },

    async listForSpace(financialSpaceId) {
      const { rows } = await db.query<SeriesRow>(
        `SELECT ${COLUMNS} FROM recurrence_series WHERE financial_space_id = $1
         ORDER BY created_at, id`,
        [financialSpaceId],
      );
      return rows.map(toSeries);
    },

    async listNeedingMaterialization(financialSpaceId, through) {
      const { rows } = await db.query<SeriesRow>(
        `SELECT ${COLUMNS} FROM recurrence_series
         WHERE financial_space_id = $1
           AND (materialized_through IS NULL OR materialized_through < $2::date)
           AND (end_date IS NULL OR materialized_through IS NULL OR materialized_through < end_date)
         ORDER BY created_at, id`,
        [financialSpaceId, through],
      );
      return rows.map(toSeries);
    },

    async lockForMaterialization(financialSpaceId, seriesId) {
      const { rows } = await db.query<SeriesRow>(
        `SELECT ${COLUMNS} FROM recurrence_series
         WHERE financial_space_id = $1 AND id = $2 FOR UPDATE`,
        [financialSpaceId, seriesId],
      );
      const [row] = rows;
      return row === undefined ? null : toSeries(row);
    },

    async insertOccurrences(series, occurrences) {
      if (occurrences.length === 0) {
        return 0;
      }
      const result = await db.query(
        `INSERT INTO financial_transaction (
           id, financial_space_id, type, status, description, amount_minor, currency,
           financial_date, category_id, subcategory_id, created_by_user_id,
           recurrence_series_id, occurrence_date
         )
         SELECT occurrence.id, $1, $2, 'pending', $3, $4, $5, occurrence.financial_date,
                $6, $7, $8, $9, occurrence.occurrence_date
         FROM unnest($10::uuid[], $11::date[], $12::date[])
           AS occurrence(id, occurrence_date, financial_date)
         ON CONFLICT (recurrence_series_id, occurrence_date) DO NOTHING`,
        [
          series.financialSpaceId,
          series.type,
          series.description,
          String(series.amountMinor),
          series.currency,
          series.categoryId,
          series.subcategoryId,
          series.createdByUserId,
          series.id,
          occurrences.map((occurrence) => occurrence.id),
          occurrences.map((occurrence) => occurrence.occurrenceDate),
          occurrences.map((occurrence) => occurrence.financialDate),
        ],
      );
      return result.rowCount ?? 0;
    },

    async updateDefaults(series, defaults, endDate) {
      const { rows } = await db.query<SeriesRow>(
        `UPDATE recurrence_series SET description = $3, amount_minor = $4, category_id = $5,
           subcategory_id = $6, end_date = $7, version = version + 1, updated_at = now()
         WHERE id = $1 AND version = $2
         RETURNING ${COLUMNS}`,
        [
          series.id,
          series.version,
          defaults.description,
          String(defaults.amountMinor),
          defaults.categoryId,
          defaults.subcategoryId,
          endDate,
        ],
      );
      const [row] = rows;
      return row === undefined ? null : toSeries(row);
    },

    async listFollowingOccurrences(seriesId, fromOccurrenceDate, inclusive) {
      const { rows } = await db.query<{
        id: string;
        occurrence_date: FinancialDate;
        description: string;
        amount_minor: string;
        category_id: string;
        subcategory_id: string | null;
      }>(
        `SELECT id, occurrence_date, description, amount_minor, category_id, subcategory_id
         FROM financial_transaction
         WHERE recurrence_series_id = $1
           AND occurrence_date ${inclusive ? '>=' : '>'} $2::date
           AND status = 'pending' AND deleted_at IS NULL AND NOT individually_modified
         ORDER BY occurrence_date
         FOR UPDATE`,
        [seriesId, fromOccurrenceDate],
      );
      return rows.map((row) => ({
        id: row.id,
        occurrenceDate: row.occurrence_date,
        description: row.description,
        amountMinor: Number(row.amount_minor),
        categoryId: row.category_id,
        subcategoryId: row.subcategory_id,
      }));
    },

    async applyDefaultsToOccurrences(ids, defaults, actorUserId) {
      if (ids.length === 0) {
        return;
      }
      await db.query(
        `UPDATE financial_transaction SET description = $2, amount_minor = $3, category_id = $4,
           subcategory_id = $5, updated_by_user_id = $6, version = version + 1, updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [
          ids,
          defaults.description,
          String(defaults.amountMinor),
          defaults.categoryId,
          defaults.subcategoryId,
          actorUserId,
        ],
      );
    },

    async softDeleteOccurrences(ids, actorUserId) {
      if (ids.length === 0) {
        return;
      }
      await db.query(
        `UPDATE financial_transaction SET deleted_at = now(), deleted_by_user_id = $2,
           version = version + 1, updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [ids, actorUserId],
      );
    },

    async setMaterializedThrough(seriesId, through) {
      await db.query(
        `UPDATE recurrence_series
         SET materialized_through = GREATEST(COALESCE(materialized_through, $2::date), $2::date)
         WHERE id = $1`,
        [seriesId, through],
      );
    },
  };
}
