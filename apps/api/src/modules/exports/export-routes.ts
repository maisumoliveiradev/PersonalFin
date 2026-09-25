import {
  addDays,
  isValidFinancialDate,
  isValidMonth,
  monthRange,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { ValidationError } from '../../http/errors.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import {
  collectTransactions,
  EXPORT_FORMATS,
  transactionsToCsv,
  transactionsToXlsx,
} from './transaction-export.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const dateSchema = z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');
const querySchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  month: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)').optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  categoryId: z.uuid().optional(),
  tagId: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

export const CONTENT_TYPES = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export function registerExportRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/exports/transactions', async (request, reply) => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    const query = parseInput(querySchema, request.query);
    if (query.month !== undefined && (query.from !== undefined || query.to !== undefined)) {
      throw new ValidationError('month: cannot be combined with from/to');
    }
    if (query.from !== undefined && query.to !== undefined && query.from > query.to) {
      throw new ValidationError('from: must not be after to');
    }
    let range: { start: string; endExclusive: string } | undefined;
    if (query.month !== undefined) {
      range = monthRange(query.month);
    } else if (query.from !== undefined || query.to !== undefined) {
      range = {
        start: query.from ?? '1900-01-01',
        endExclusive: addDays(query.to ?? '9999-12-30', 1),
      };
    }
    const transactions = await collectTransactions(data, {
      financialSpaceId: space.id,
      ...(range === undefined ? {} : { range }),
      ...(query.type === undefined ? {} : { type: query.type }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
      ...(query.tagId === undefined ? {} : { tagId: query.tagId }),
      ...(query.q === undefined ? {} : { text: query.q }),
    });
    const body =
      query.format === 'csv'
        ? transactionsToCsv(transactions)
        : await transactionsToXlsx(transactions);
    const name = `lancamentos-${query.month ?? 'periodo'}.${query.format}`;
    return reply
      .header('content-type', CONTENT_TYPES[query.format])
      .header('content-disposition', `attachment; filename="${name}"`)
      .send(body);
  });
}
