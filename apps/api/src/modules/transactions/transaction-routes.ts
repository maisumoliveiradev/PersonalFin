import type {
  TransactionList,
  Transaction as TransactionResponse,
} from '@personalfin/api-contract';
import {
  CURRENCY_CODES,
  type CurrencyCode,
  DEFAULT_CURRENCY,
  DEFAULT_TRANSACTION_STATUS,
  isValidAmountMinor,
  isValidFinancialDate,
  isValidInstallmentCount,
  isValidMonth,
  isValidRate,
  MAX_AMOUNT_MINOR,
  MAX_INSTALLMENTS,
  MIN_INSTALLMENTS,
  monthRange,
  normalizeTransactionDescription,
  SYNC_RESOLUTIONS,
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { ValidationError } from '../../http/errors.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { createInstallmentPurchase } from '../cards/card-installment-management.ts';
import { InvalidCardPurchaseError } from '../cards/card-invoice-management.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { MAX_TAGS_PER_TRANSACTION } from '../tags/tag.ts';
import { createTransactionOnce } from './create-transaction.ts';
import type { FinancialTransaction } from './transaction.ts';
import { deleteTransaction, restoreTransaction } from './transaction-deletion.ts';
import { InvalidCursorError } from './transaction-repository.ts';
import { TransactionNotFoundError, updateTransaction } from './update-transaction.ts';

const FOREIGN_CURRENCIES = CURRENCY_CODES.filter((code) => code !== DEFAULT_CURRENCY) as [
  CurrencyCode,
  ...CurrencyCode[],
];

const foreignAmountSchema = z.strictObject({
  currency: z.enum(FOREIGN_CURRENCIES),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`),
  rate: z
    .string()
    .refine(isValidRate, 'must be a positive decimal with up to 10 decimals')
    .optional(),
});

const createTransactionSchema = z.strictObject({
  id: z.uuid().optional(),
  foreign: foreignAmountSchema.optional(),
  type: z.enum(TRANSACTION_TYPES),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  description: z
    .string()
    .transform(normalizeTransactionDescription)
    .pipe(z.string().min(1).max(TRANSACTION_DESCRIPTION_MAX_LENGTH)),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`)
    .optional(),
  financialDate: z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)'),
  categoryId: z.uuid(),
  subcategoryId: z.uuid().nullable().optional(),
  cardId: z.uuid().optional(),
  invoiceMonth: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)').optional(),
  tagIds: z.array(z.uuid()).max(MAX_TAGS_PER_TRANSACTION).optional(),
  installments: z
    .number()
    .refine(
      isValidInstallmentCount,
      `must be an integer from ${MIN_INSTALLMENTS} to ${MAX_INSTALLMENTS}`,
    )
    .optional(),
});

const spaceParamsSchema = z.object({ spaceId: z.string() });
const transactionParamsSchema = z.object({ spaceId: z.string(), transactionId: z.string() });

const syncContextSchema = z.strictObject({
  resolution: z.enum(SYNC_RESOLUTIONS),
  baseVersion: z.number().int().min(1),
});

function toAuditContext(sync: z.infer<typeof syncContextSchema> | undefined) {
  return sync === undefined ? {} : { syncContext: { source: 'offline_sync' as const, ...sync } };
}

const updateTransactionSchema = z.strictObject({
  version: z.number().int().min(1),
  foreign: foreignAmountSchema.nullable().optional(),
  sync: syncContextSchema.optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  description: z
    .string()
    .transform(normalizeTransactionDescription)
    .pipe(z.string().min(1).max(TRANSACTION_DESCRIPTION_MAX_LENGTH))
    .optional(),
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`)
    .optional(),
  financialDate: z
    .string()
    .refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)')
    .optional(),
  categoryId: z.uuid().optional(),
  subcategoryId: z.uuid().nullable().optional(),
  invoiceMonth: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)').optional(),
  tagIds: z.array(z.uuid()).max(MAX_TAGS_PER_TRANSACTION).optional(),
});

export const DEFAULT_TRANSACTION_LIST_LIMIT = 100;
export const MAX_TRANSACTION_LIST_LIMIT = 200;

const versionQuerySchema = z
  .object({
    version: z.coerce.number().int().min(1),
    syncResolution: z.enum(SYNC_RESOLUTIONS).optional(),
    syncBaseVersion: z.coerce.number().int().min(1).optional(),
  })
  .refine(
    (query) => (query.syncResolution === undefined) === (query.syncBaseVersion === undefined),
    'syncResolution and syncBaseVersion go together',
  );
const versionBodySchema = z.strictObject({
  version: z.number().int().min(1),
  sync: syncContextSchema.optional(),
});

const listTransactionsQuerySchema = z.object({
  state: z.enum(['active', 'deleted']).default('active'),
  month: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)').optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  status: z.enum(TRANSACTION_STATUSES).optional(),
  categoryId: z.uuid().optional(),
  tagId: z.uuid().optional(),
  q: z.string().trim().min(1).max(100).optional(),
  cursor: z.string().min(1).max(500).optional(),
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
    version: transaction.version,
    deletedAt: transaction.deletedAt?.toISOString() ?? null,
    recurrenceSeriesId: transaction.recurrenceSeriesId,
    occurrenceDate: transaction.occurrenceDate,
    cardPurchase:
      transaction.cardPurchase === null
        ? null
        : {
            cardId: transaction.cardPurchase.cardId,
            cardName: transaction.cardPurchase.cardName,
            invoiceMonth: transaction.cardPurchase.invoiceMonth,
            invoiceSettled: transaction.cardPurchase.invoiceSettled,
          },
    installment: transaction.installment,
    tags: transaction.tags,
    original: transaction.original,
  };
}

function withoutUndefined<Value extends Record<string, unknown>>(value: Value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as { [Key in keyof Value]?: Exclude<Value[Key], undefined> };
}

export function registerTransactionRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/transactions/:transactionId',
    async (request): Promise<TransactionResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId, transactionId } = parseInput(transactionParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'view',
      );
      const transaction = isUuid(transactionId)
        ? await data.repositories.transactions.findInSpace(space.id, transactionId)
        : null;
      if (transaction === null) {
        throw new TransactionNotFoundError();
      }
      return toTransactionResponse(transaction);
    },
  );

  server.delete(
    '/financial-spaces/:spaceId/transactions/:transactionId',
    async (request): Promise<TransactionResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId, transactionId } = parseInput(transactionParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'record',
      );
      if (!isUuid(transactionId)) {
        throw new TransactionNotFoundError();
      }
      const { version, syncResolution, syncBaseVersion } = parseInput(
        versionQuerySchema,
        request.query,
      );
      const transaction = await deleteTransaction(data, {
        financialSpaceId: space.id,
        transactionId,
        actorUserId: user.id,
        expectedVersion: version,
        ...toAuditContext(
          syncResolution === undefined || syncBaseVersion === undefined
            ? undefined
            : { resolution: syncResolution, baseVersion: syncBaseVersion },
        ),
      });
      return toTransactionResponse(transaction);
    },
  );

  server.post(
    '/financial-spaces/:spaceId/transactions/:transactionId/restore',
    async (request): Promise<TransactionResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId, transactionId } = parseInput(transactionParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'record',
      );
      if (!isUuid(transactionId)) {
        throw new TransactionNotFoundError();
      }
      const { version, sync } = parseInput(versionBodySchema, request.body);
      const transaction = await restoreTransaction(data, {
        financialSpaceId: space.id,
        transactionId,
        actorUserId: user.id,
        expectedVersion: version,
        ...toAuditContext(sync),
      });
      return toTransactionResponse(transaction);
    },
  );

  server.patch(
    '/financial-spaces/:spaceId/transactions/:transactionId',
    async (request): Promise<TransactionResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId, transactionId } = parseInput(transactionParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'record',
      );
      if (!isUuid(transactionId)) {
        throw new TransactionNotFoundError();
      }
      const { version, invoiceMonth, tagIds, sync, foreign, ...changes } = parseInput(
        updateTransactionSchema,
        request.body,
      );
      if (foreign != null && changes.amountMinor !== undefined) {
        throw new ValidationError('amountMinor: send either amountMinor or foreign');
      }
      const transaction = await updateTransaction(data, {
        financialSpaceId: space.id,
        transactionId,
        actorUserId: user.id,
        expectedVersion: version,
        changes: withoutUndefined(changes),
        ...(invoiceMonth === undefined ? {} : { invoiceMonth }),
        ...(tagIds === undefined ? {} : { tagIds }),
        ...(foreign === undefined ? {} : { foreign }),
        ...toAuditContext(sync),
      });
      return toTransactionResponse(transaction);
    },
  );

  server.get(
    '/financial-spaces/:spaceId/transactions',
    async (request): Promise<TransactionList> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'view',
      );
      const filters = parseInput(listTransactionsQuerySchema, request.query);
      try {
        const page = await data.repositories.transactions.list({
          financialSpaceId: space.id,
          state: filters.state,
          limit: filters.limit,
          cursor: filters.cursor ?? null,
          ...(filters.month === undefined ? {} : { range: monthRange(filters.month) }),
          ...(filters.type === undefined ? {} : { type: filters.type }),
          ...(filters.status === undefined ? {} : { status: filters.status }),
          ...(filters.categoryId === undefined ? {} : { categoryId: filters.categoryId }),
          ...(filters.tagId === undefined ? {} : { tagId: filters.tagId }),
          ...(filters.q === undefined ? {} : { text: filters.q }),
        });
        return {
          items: page.items.map(toTransactionResponse),
          hasMore: page.nextCursor !== null,
          nextCursor: page.nextCursor,
        };
      } catch (error) {
        if (error instanceof InvalidCursorError) {
          throw new ValidationError('cursor: invalid');
        }
        throw error;
      }
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
        'record',
      );
      const input = parseInput(createTransactionSchema, request.body);
      if ((input.amountMinor === undefined) === (input.foreign === undefined)) {
        throw new ValidationError('amountMinor: send exactly one of amountMinor or foreign');
      }
      if (input.foreign !== undefined && input.installments !== undefined) {
        throw new ValidationError('foreign: not supported on installment purchases');
      }
      if (input.cardId === undefined && input.invoiceMonth !== undefined) {
        throw new InvalidCardPurchaseError('invoiceMonth requires cardId');
      }
      if (input.cardId === undefined && input.installments !== undefined) {
        throw new InvalidCardPurchaseError('installments require cardId');
      }
      if (input.installments !== undefined && input.id !== undefined) {
        throw new ValidationError('id: not supported on installment purchases');
      }
      if (input.installments !== undefined && (input.tagIds ?? []).length > 0) {
        throw new ValidationError('tagIds: not supported on installment purchases');
      }
      if (input.cardId !== undefined && input.status !== undefined) {
        throw new InvalidCardPurchaseError('Card purchases have no status; it follows the invoice');
      }
      const fields = {
        financialSpaceId: space.id,
        createdByUserId: user.id,
        type: input.type,
        status: input.status ?? DEFAULT_TRANSACTION_STATUS,
        description: input.description,
        amountMinor: input.amountMinor ?? 0,
        financialDate: input.financialDate,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId ?? null,
      };
      const card =
        input.cardId === undefined
          ? undefined
          : {
              cardId: input.cardId,
              ...(input.invoiceMonth === undefined ? {} : { invoiceMonth: input.invoiceMonth }),
            };
      let transaction: FinancialTransaction;
      let replayed = false;
      if (card !== undefined && input.installments !== undefined) {
        const [first] = await createInstallmentPurchase(data, {
          ...fields,
          card,
          installments: input.installments,
        });
        if (first === undefined) {
          throw new Error('Installment purchase created no installment');
        }
        transaction = first;
      } else {
        ({ transaction, replayed } = await createTransactionOnce(data, {
          ...fields,
          ...(input.id === undefined ? {} : { id: input.id }),
          ...(input.tagIds === undefined ? {} : { tagIds: input.tagIds }),
          ...(card === undefined ? {} : { card }),
          ...(input.foreign === undefined ? {} : { foreign: input.foreign }),
        }));
      }
      reply.status(replayed ? 200 : 201);
      return toTransactionResponse(transaction);
    },
  );
}
