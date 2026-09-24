import type { MonthlyDashboard as MonthlyDashboardResponse } from '@personalfin/api-contract';
import { isValidMonth } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { getMonthlyDashboard } from './get-dashboard.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const dashboardQuerySchema = z.object({
  month: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
});

export function registerDashboardRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/dashboard',
    async (request): Promise<MonthlyDashboardResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { month } = parseInput(dashboardQuerySchema, request.query);
      return getMonthlyDashboard(data, space.id, month);
    },
  );
}
