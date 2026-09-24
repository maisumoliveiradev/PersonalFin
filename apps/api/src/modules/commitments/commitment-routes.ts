import type { Commitments } from '@personalfin/api-contract';
import { addDays, isValidFinancialDate } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { toTransactionResponse } from '../transactions/transaction-routes.ts';

const EARLIEST_DATE = '1900-01-01';
const SECTION_LIMIT = 200;

const spaceParamsSchema = z.object({ spaceId: z.string() });
const commitmentsQuerySchema = z.object({
  from: z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)'),
  days: z.coerce.number().int().min(7).max(365).default(30),
});

export function registerCommitmentRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/commitments', async (request): Promise<Commitments> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(data.repositories.financialSpaces, user.id, spaceId);
    const { from, days } = parseInput(commitmentsQuerySchema, request.query);
    const through = addDays(from, days - 1);
    const sections = {
      overdue: { start: EARLIEST_DATE, endExclusive: from },
      upcoming: { start: from, endExclusive: addDays(through, 1) },
    };

    const [overdue, upcoming] = await Promise.all(
      [sections.overdue, sections.upcoming].map(async (range) => {
        const [page, totals] = await Promise.all([
          data.repositories.transactions.list({
            financialSpaceId: space.id,
            state: 'active',
            status: 'pending',
            range,
            limit: SECTION_LIMIT,
            cursor: null,
          }),
          data.repositories.dashboard.monthTotals({ financialSpaceId: space.id, ...range }),
        ]);
        return {
          items: [...page.items]
            .sort((left, right) => left.financialDate.localeCompare(right.financialDate))
            .map(toTransactionResponse),
          hasMore: page.nextCursor !== null,
          income: totals.forecastIncome,
          expenses: totals.forecastExpenses,
        };
      }),
    );

    return {
      from,
      through,
      overdue: overdue ?? { items: [], hasMore: false, income: 0, expenses: 0 },
      upcoming: upcoming ?? { items: [], hasMore: false, income: 0, expenses: 0 },
    };
  });
}
