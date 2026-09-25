import type { Breakdown, Comparison, Evolution } from '@personalfin/api-contract';
import { isValidMonth } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { getBreakdown, getComparison, getEvolution } from './analytics.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const monthSchema = z.string().refine(isValidMonth, 'must be a month (YYYY-MM)');
const evolutionQuerySchema = z.object({
  fromMonth: monthSchema,
  months: z.coerce.number().int().min(1).max(24).default(12),
});
const comparisonQuerySchema = z.object({ month: monthSchema });
const breakdownQuerySchema = z.object({
  fromMonth: monthSchema,
  months: z.coerce
    .number()
    .int()
    .refine((value) => [1, 3, 6, 12].includes(value), 'must be 1, 3, 6, or 12')
    .default(1),
});

export function registerAnalyticsRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/analytics/evolution',
    async (request): Promise<Evolution> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { fromMonth, months } = parseInput(evolutionQuerySchema, request.query);
      return { items: await getEvolution(data, space.id, fromMonth, months) };
    },
  );

  server.get(
    '/financial-spaces/:spaceId/analytics/comparison',
    async (request): Promise<Comparison> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { month } = parseInput(comparisonQuerySchema, request.query);
      return getComparison(data, space.id, month);
    },
  );

  server.get(
    '/financial-spaces/:spaceId/analytics/breakdown',
    async (request): Promise<Breakdown> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { fromMonth, months } = parseInput(breakdownQuerySchema, request.query);
      return getBreakdown(data, space.id, fromMonth, months);
    },
  );
}
