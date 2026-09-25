import { isValidMonth } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { buildMonthlyReport } from './monthly-report.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const querySchema = z.object({
  month: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
});

export function registerReportRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/reports/monthly', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    const { month } = parseInput(querySchema, request.query);
    const pdf = await buildMonthlyReport(data, {
      financialSpaceId: space.id,
      spaceName: space.name,
      month,
      generatedAt: new Date(),
    });
    return reply
      .header('content-type', 'application/pdf')
      .header('content-disposition', `attachment; filename="relatorio-${month}.pdf"`)
      .send(pdf);
  });
}
