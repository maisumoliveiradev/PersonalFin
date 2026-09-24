import { randomUUID } from 'node:crypto';

import {
  DEFAULT_CURRENCY,
  type FinancialDate,
  type Month,
  maxMaterializationEnd,
  type NonBusinessDayRule,
  occurrencesThrough,
  type RecurrenceFrequency,
  type TransactionType,
} from '@personalfin/domain';

import type { DataAccess, Repositories } from '../../database/data-access.ts';
import { ValidationError } from '../../http/errors.ts';
import { assertCategorySelection } from '../transactions/category-selection.ts';
import type { RecurrenceSeries } from './recurrence-series.ts';

export interface CreateRecurrenceInput {
  financialSpaceId: string;
  actorUserId: string;
  type: TransactionType;
  description: string;
  amountMinor: number;
  categoryId: string;
  subcategoryId: string | null;
  frequency: RecurrenceFrequency;
  nonBusinessDayRule: NonBusinessDayRule;
  startDate: FinancialDate;
  endDate: FinancialDate | null;
  materializeThrough: FinancialDate;
}

async function materializeLocked(
  repositories: Repositories,
  series: RecurrenceSeries,
  through: FinancialDate,
): Promise<number> {
  if (series.materializedThrough !== null && series.materializedThrough >= through) {
    return 0;
  }
  const occurrences = occurrencesThrough(series, through)
    .filter(
      (occurrence) =>
        series.materializedThrough === null ||
        occurrence.occurrenceDate > series.materializedThrough,
    )
    .map((occurrence) => ({ id: randomUUID(), seriesId: series.id, ...occurrence }));
  const created = await repositories.recurrences.insertOccurrences(series, occurrences);
  await repositories.recurrences.setMaterializedThrough(series.id, through);
  return created;
}

export async function createRecurrenceSeries(
  data: DataAccess,
  input: CreateRecurrenceInput,
): Promise<{ series: RecurrenceSeries; occurrencesCreated: number }> {
  if (input.endDate !== null && input.endDate < input.startDate) {
    throw new ValidationError('endDate: must not be before startDate');
  }
  return data.transaction(async (repositories) => {
    await assertCategorySelection(repositories.categories, input);
    const series = await repositories.recurrences.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      type: input.type,
      description: input.description,
      amountMinor: input.amountMinor,
      currency: DEFAULT_CURRENCY,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      frequency: input.frequency,
      nonBusinessDayRule: input.nonBusinessDayRule,
      startDate: input.startDate,
      endDate: input.endDate,
      createdByUserId: input.actorUserId,
    });
    const occurrencesCreated = await materializeLocked(
      repositories,
      series,
      input.materializeThrough,
    );
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'recurrence_series',
      entityId: series.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        description: { before: null, after: series.description },
        amountMinor: { before: null, after: series.amountMinor },
        frequency: { before: null, after: series.frequency },
        startDate: { before: null, after: series.startDate },
        endDate: { before: null, after: series.endDate },
      },
    });
    return {
      series: { ...series, materializedThrough: input.materializeThrough },
      occurrencesCreated,
    };
  });
}

export async function materializeSpace(
  data: DataAccess,
  financialSpaceId: string,
  through: FinancialDate,
  currentMonth: Month,
): Promise<number> {
  const limit = maxMaterializationEnd(currentMonth);
  const target = through > limit ? limit : through;
  const pending = await data.repositories.recurrences.listNeedingMaterialization(
    financialSpaceId,
    target,
  );
  let created = 0;
  for (const candidate of pending) {
    created += await data.transaction(async (repositories) => {
      const series = await repositories.recurrences.lockForMaterialization(
        financialSpaceId,
        candidate.id,
      );
      return series === null ? 0 : materializeLocked(repositories, series, target);
    });
  }
  return created;
}
