import type { FinancialDate } from '@personalfin/domain';

import type { NewOccurrence, NewRecurrenceSeries, RecurrenceSeries } from './recurrence-series.ts';

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
}
