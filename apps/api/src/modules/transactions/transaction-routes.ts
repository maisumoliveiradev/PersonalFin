import type {
  TransactionList,
  Transaction as TransactionResponse,
} from '@personalfin/api-contract';
import {
  DEFAULT_TRANSACTION_STATUS,
  isValidAmountMinor,
  isValidFinancialDate,
  MAX_AMOUNT_MINOR,
  normalizeTransactionDescription,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { createTransaction } from './create-transaction.ts';
import type { FinancialTransaction } from './transaction.ts';

const createTransactionSchema = z.strictObject({
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  description: z
    .string()
    .transform(normalizeTransactionDescription)
    .pipe(z.string().min(1).max(TRANSACTION_DESCRIPTION_MAX_LENGTH)),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`),
  financialDate: z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)'),
  categoryId: z.uuid(),
  subcategoryId: z.uuid().nullable().optional(),
});

const spaceParamsSchema = z.object({ spaceId: z.string() });

export const DEFAULT_TRANSACTION_LIST_LIMIT = 100;
export const MAX_TRANSACTION_LIST_LIMIT = 200;

const listTransactionsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_TRANSACTION_LIST_LIMIT)
    .default(DEFAULT_TRANSACTION_LIST_LIMIT),
});

export function toTransactionResponse(transaction: FinancialTransaction): TransactionResponse {
  return {
    id: transaction.id,
    type: transaction.type,
    status: transaction.status,
    description: transaction.description,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    financialDate: transaction.financialDate,
    category: transaction.category,
    subcategory: transaction.subcategory,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export function registerTransactionRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/transactions',
    async (request): Promise<TransactionList> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const { limit } = parseInput(listTransactionsQuerySchema, request.query);
      const transactions = await data.repositories.transactions.listRecentForSpace(
        space.id,
        limit + 1,
      );
      return {
        items: transactions.slice(0, limit).map(toTransactionResponse),
        hasMore: transactions.length > limit,
      };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/transactions',
    async (request, reply): Promise<TransactionResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
      );
      const input = parseInput(createTransactionSchema, request.body);
      const transaction = await createTransaction(data, {
        financialSpaceId: space.id,
        createdByUserId: user.id,
        type: input.type,
        status: input.status ?? DEFAULT_TRANSACTION_STATUS,
        description: input.description,
        amountMinor: input.amountMinor,
        financialDate: input.financialDate,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
      });
      reply.status(201);
      return toTransactionResponse(transaction);
    },
  );
}
