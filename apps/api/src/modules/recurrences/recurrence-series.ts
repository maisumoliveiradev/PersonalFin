import type {
  CurrencyCode,
  FinancialDate,
  NonBusinessDayRule,
  RecurrenceFrequency,
  TransactionType,
} from '@personalfin/domain';

export interface RecurrenceSeries {
  id: string;
  financialSpaceId: string;
  type: TransactionType;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  categoryId: string;
  subcategoryId: string | null;
  frequency: RecurrenceFrequency;
  nonBusinessDayRule: NonBusinessDayRule;
  startDate: FinancialDate;
  endDate: FinancialDate | null;
  materializedThrough: FinancialDate | null;
  createdByUserId: string;
  version: number;
}

export type NewRecurrenceSeries = Omit<RecurrenceSeries, 'materializedThrough' | 'version'>;

export interface SeriesDefaults {
  description: string;
  amountMinor: number;
  categoryId: string;
  subcategoryId: string | null;
}

export interface OccurrenceSnapshot extends SeriesDefaults {
  id: string;
  occurrenceDate: FinancialDate;
}

export interface NewOccurrence {
  id: string;
  seriesId: string;
  occurrenceDate: FinancialDate;
  financialDate: FinancialDate;
}
