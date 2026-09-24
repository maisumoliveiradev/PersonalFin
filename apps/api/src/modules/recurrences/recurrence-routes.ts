import type {
  RecurrenceSeriesCreated,
  RecurrenceSeriesList,
  RecurrenceSeries as RecurrenceSeriesResponse,
} from '@personalfin/api-contract';
import {
  defaultMaterializationEnd,
  isValidAmountMinor,
  isValidFinancialDate,
  isValidMonth,
  lastDayOf,
  MAX_AMOUNT_MINOR,
  type Month,
  monthOf,
  NON_BUSINESS_DAY_RULES,
  normalizeTransactionDescription,
  RECURRENCE_FREQUENCIES,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_TYPES,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { createRecurrenceSeries, materializeSpace } from './recurrence-management.ts';
import type { RecurrenceSeries } from './recurrence-series.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const financialDateSchema = z
  .string()
  .refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');

const createRecurrenceSchema = z.strictObject({
  type: z.enum(TRANSACTION_TYPES),
  description: z
    .string()
    .transform(normalizeTransactionDescription)
    .pipe(z.string().min(1).max(TRANSACTION_DESCRIPTION_MAX_LENGTH)),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`),
  categoryId: z.uuid(),
  subcategoryId: z.uuid().nullable().optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  nonBusinessDayRule: z.enum(NON_BUSINESS_DAY_RULES),
  startDate: financialDateSchema,
  endDate: financialDateSchema.nullable().optional(),
});

const materializeSchema = z.strictObject({
  throughMonth: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
});

function serverCurrentMonth(): Month {
  return monthOf(new Date().toISOString().slice(0, 10));
}

function toResponse(series: RecurrenceSeries): RecurrenceSeriesResponse {
  return {
    id: series.id,
    type: series.type,
    description: series.description,
    amountMinor: series.amountMinor,
    currency: series.currency,
    categoryId: series.categoryId,
    subcategoryId: series.subcategoryId,
    frequency: series.frequency,
    nonBusinessDayRule: series.nonBusinessDayRule,
    startDate: series.startDate,
    endDate: series.endDate,
    materializedThrough: series.materializedThrough,
    version: series.version,
  };
}

export function registerRecurrenceRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/recurrences',
    async (request): Promise<RecurrenceSeriesList> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const series = await data.repositories.recurrences.listForSpace(space.id);
      return { items: series.map(toResponse) };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/recurrences',
    async (request, reply): Promise<RecurrenceSeriesCreated> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const input = parseInput(createRecurrenceSchema, request.body);
      const { series, occurrencesCreated } = await createRecurrenceSeries(data, {
        financialSpaceId: space.id,
        actorUserId: user.id,
        type: input.type,
        description: input.description,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
        frequency: input.frequency,
        nonBusinessDayRule: input.nonBusinessDayRule,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        materializeThrough: defaultMaterializationEnd(serverCurrentMonth()),
      });
      reply.status(201);
      return { series: toResponse(series), occurrencesCreated };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/recurrences/materialize',
    async (request): Promise<{ occurrencesCreated: number }> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { throughMonth } = parseInput(materializeSchema, request.body);
      const occurrencesCreated = await materializeSpace(
        data,
        space.id,
        lastDayOf(throughMonth),
        serverCurrentMonth(),
      );
      return { occurrencesCreated };
    },
  );
}
