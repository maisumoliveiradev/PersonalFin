import type { FinancialDate } from '@personalfin/domain';

import type {
  NewOccurrence,
  NewRecurrenceSeries,
  OccurrenceSnapshot,
  RecurrenceSeries,
  SeriesDefaults,
} from './recurrence-series.ts';

export interface RecurrenceRepository {
  create(series: NewRecurrenceSeries): Promise<RecurrenceSeries>;
  listForSpace(financialSpaceId: string): Promise<RecurrenceSeries[]>;
  listNeedingMaterialization(
    financialSpaceId: string,
    through: FinancialDate,
  ): Promise<RecurrenceSeries[]>;
  lockForMaterialization(
    financialSpaceId: string,
    seriesId: string,
  ): Promise<RecurrenceSeries | null>;
  insertOccurrences(
    series: RecurrenceSeries,
    occurrences: readonly NewOccurrence[],
  ): Promise<number>;
  setMaterializedThrough(seriesId: string, through: FinancialDate): Promise<void>;
  updateDefaults(
    series: RecurrenceSeries,
    defaults: SeriesDefaults,
    endDate: FinancialDate | null,
  ): Promise<RecurrenceSeries | null>;
  listFollowingOccurrences(
    seriesId: string,
    fromOccurrenceDate: FinancialDate,
    inclusive: boolean,
  ): Promise<OccurrenceSnapshot[]>;
  applyDefaultsToOccurrences(
    ids: readonly string[],
    defaults: SeriesDefaults,
    actorUserId: string,
  ): Promise<void>;
  softDeleteOccurrences(ids: readonly string[], actorUserId: string): Promise<void>;
}
