import type {
  DebtDetail as DebtDetailResponse,
  DebtList,
  Debt as DebtResponse,
} from '@personalfin/api-contract';
import {
  DEBT_NAME_MAX_LENGTH,
  DEBT_PAYMENT_KINDS,
  isValidAmountMinor,
  isValidDebtInstallmentCount,
  isValidFinancialDate,
  MAX_AMOUNT_MINOR,
  MAX_DEBT_INSTALLMENTS,
  summarizeDebt,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { type Debt, type DebtPayment, normalizeDebtName } from './debt.ts';
import { DebtNotFoundError, DebtPaymentNotFoundError } from './debt-errors.ts';
import {
  createDebt,
  type DebtDetail,
  recordDebtPayment,
  removeDebtPayment,
  updateDebt,
} from './debt-management.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const debtParamsSchema = z.object({ spaceId: z.string(), debtId: z.string() });
const paymentParamsSchema = z.object({
  spaceId: z.string(),
  debtId: z.string(),
  paymentId: z.string(),
});

const nameSchema = z
  .string()
  .transform(normalizeDebtName)
  .pipe(z.string().min(1).max(DEBT_NAME_MAX_LENGTH));
const amountSchema = z
  .number()
  .refine(isValidAmountMinor, `must be an integer from 1 to ${MAX_AMOUNT_MINOR}`);
const countSchema = z
  .number()
  .refine(isValidDebtInstallmentCount, `must be an integer from 1 to ${MAX_DEBT_INSTALLMENTS}`);
const dateSchema = z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');

const createDebtSchema = z.strictObject({
  name: nameSchema,
  originalAmountMinor: amountSchema,
  installmentCount: countSchema,
  installmentAmountMinor: amountSchema.optional(),
  firstDueDate: dateSchema,
});

const updateDebtSchema = z.strictObject({
  version: z.number().int().min(1),
  name: nameSchema.optional(),
  installmentCount: countSchema.optional(),
  installmentAmountMinor: amountSchema.optional(),
  firstDueDate: dateSchema.optional(),
  archived: z.boolean().optional(),
});

const paymentSchema = z.strictObject({
  kind: z.enum(DEBT_PAYMENT_KINDS).default('installment'),
  amountMinor: amountSchema,
  paidOn: dateSchema,
});

export function toDebtResponse(debt: Debt, payments: readonly DebtPayment[]): DebtResponse {
  return {
    id: debt.id,
    name: debt.name,
    originalAmountMinor: debt.originalAmountMinor,
    currency: debt.currency,
    installmentCount: debt.installmentCount,
    installmentAmountMinor: debt.installmentAmountMinor,
    firstDueDate: debt.firstDueDate,
    archived: debt.archivedAt !== null,
    version: debt.version,
    summary: summarizeDebt(
      debt,
      payments.filter((payment) => payment.debtId === debt.id),
    ),
  };
}

export function toDebtDetail({ debt, payments }: DebtDetail): DebtDetailResponse {
  return {
    ...toDebtResponse(debt, payments),
    payments: payments.map((payment) => ({
      id: payment.id,
      kind: payment.kind,
      amountMinor: payment.amountMinor,
      paidOn: payment.paidOn,
      recordedAt: payment.recordedAt.toISOString(),
    })),
  };
}

export function requireDebtId(debtId: string): string {
  if (!isUuid(debtId)) {
    throw new DebtNotFoundError();
  }
  return debtId;
}

export function registerDebtRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/debts', async (request): Promise<DebtList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      'view',
    );
    const [debts, payments] = await Promise.all([
      data.repositories.debts.listForSpace(space.id),
      data.repositories.debts.listPayments(space.id),
    ]);
    return { items: debts.map((debt) => toDebtResponse(debt, payments)) };
  });

  server.post(
    '/financial-spaces/:spaceId/debts',
    async (request, reply): Promise<DebtDetailResponse> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'plan',
      );
      const input = parseInput(createDebtSchema, request.body);
      const detail = await createDebt(data, {
        financialSpaceId: space.id,
        actorUserId: user.id,
        name: input.name,
        originalAmountMinor: input.originalAmountMinor,
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        ...(input.installmentAmountMinor === undefined
          ? {}
          : { installmentAmountMinor: input.installmentAmountMinor }),
      });
      reply.status(201);
      return toDebtDetail(detail);
    },
  );

  server.get(
    '/financial-spaces/:spaceId/debts/:debtId',
    async (request): Promise<DebtDetailResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(debtParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'view',
      );
      const debtId = requireDebtId(params.debtId);
      const debt = await data.repositories.debts.findInSpace(space.id, debtId);
      if (debt === null) {
        throw new DebtNotFoundError();
      }
      return toDebtDetail({
        debt,
        payments: await data.repositories.debts.listPayments(space.id, debtId),
      });
    },
  );

  server.patch(
    '/financial-spaces/:spaceId/debts/:debtId',
    async (request): Promise<DebtDetailResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(debtParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'plan',
      );
      const { version, ...changes } = parseInput(updateDebtSchema, request.body);
      const detail = await updateDebt(data, {
        financialSpaceId: space.id,
        debtId: requireDebtId(params.debtId),
        actorUserId: user.id,
        expectedVersion: version,
        ...(changes.name === undefined ? {} : { name: changes.name }),
        ...(changes.installmentCount === undefined
          ? {}
          : { installmentCount: changes.installmentCount }),
        ...(changes.installmentAmountMinor === undefined
          ? {}
          : { installmentAmountMinor: changes.installmentAmountMinor }),
        ...(changes.firstDueDate === undefined ? {} : { firstDueDate: changes.firstDueDate }),
        ...(changes.archived === undefined ? {} : { archived: changes.archived }),
      });
      return toDebtDetail(detail);
    },
  );

  server.post(
    '/financial-spaces/:spaceId/debts/:debtId/payments',
    async (request, reply): Promise<DebtDetailResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(debtParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'record',
      );
      const input = parseInput(paymentSchema, request.body);
      const detail = await recordDebtPayment(data, {
        financialSpaceId: space.id,
        debtId: requireDebtId(params.debtId),
        actorUserId: user.id,
        ...input,
      });
      reply.status(201);
      return toDebtDetail(detail);
    },
  );

  server.delete(
    '/financial-spaces/:spaceId/debts/:debtId/payments/:paymentId',
    async (request): Promise<DebtDetailResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(paymentParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
        'record',
      );
      if (!isUuid(params.paymentId)) {
        throw new DebtPaymentNotFoundError();
      }
      const detail = await removeDebtPayment(data, {
        financialSpaceId: space.id,
        debtId: requireDebtId(params.debtId),
        paymentId: params.paymentId,
        actorUserId: user.id,
      });
      return toDebtDetail(detail);
    },
  );
}
