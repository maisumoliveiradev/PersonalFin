import type {
  CardInvoice as CardInvoiceResponse,
  CardInvoiceSummaryList,
} from '@personalfin/api-contract';
import {
  defaultInvoiceDates,
  isValidAmountMinor,
  isValidFinancialDate,
  isValidMonth,
  MAX_AMOUNT_MINOR,
  monthRange,
  shiftMonth,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { toTransactionResponse } from '../transactions/transaction-routes.ts';
import type { Card } from './card.ts';
import { CardNotFoundError } from './card-errors.ts';
import { type CardInvoice, outstandingMinor } from './card-invoice.ts';
import {
  InvoicePaymentNotFoundError,
  payInvoice,
  removeInvoicePayment,
  updateInvoiceDates,
} from './card-invoice-management.ts';

const PURCHASE_LIMIT = 200;

const invoiceParamsSchema = z.object({
  spaceId: z.string(),
  cardId: z.string(),
  month: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
});

const dateSchema = z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');

const invoiceDatesSchema = z
  .strictObject({
    version: z.number().int().min(1).nullable(),
    closingDate: dateSchema,
    dueDate: dateSchema,
  })
  .refine((input) => input.closingDate <= input.dueDate, {
    message: 'closingDate must be on or before dueDate',
  });

const paymentSchema = z.strictObject({
  amountMinor: z
    .number()
    .refine(isValidAmountMinor, `must be an integer between 1 and ${MAX_AMOUNT_MINOR}`),
  paidOn: dateSchema,
});

const cardParamsSchema = z.object({ spaceId: z.string(), cardId: z.string() });
const summaryQuerySchema = z.object({
  fromMonth: z.string().refine(isValidMonth, 'must be a month (YYYY-MM)'),
  months: z.coerce.number().int().min(1).max(24).default(6),
});

const paymentParamsSchema = z.object({ paymentId: z.string() });

function invoiceState(invoice: CardInvoice | null): CardInvoiceResponse['state'] {
  if (invoice === null || invoice.totalMinor === 0) {
    return 'empty';
  }
  if (invoice.paidMinor >= invoice.totalMinor) {
    return 'paid';
  }
  return invoice.paidMinor > 0 ? 'partially_paid' : 'open';
}

export function registerCardInvoiceRoutes(server: FastifyInstance, data: DataAccess): void {
  async function requireCard(request: { params: unknown }, userId: string) {
    const params = parseInput(invoiceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      userId,
      params.spaceId,
    );
    const card = isUuid(params.cardId)
      ? await data.repositories.cards.findInSpace(space.id, params.cardId)
      : null;
    if (card === null) {
      throw new CardNotFoundError();
    }
    return { card, month: params.month };
  }

  async function toResponse(
    card: Card,
    month: string,
    invoice: CardInvoice | null,
  ): Promise<CardInvoiceResponse> {
    const purchases =
      invoice === null
        ? { items: [], nextCursor: null }
        : await data.repositories.transactions.list({
            financialSpaceId: card.financialSpaceId,
            state: 'active',
            cardInvoiceId: invoice.id,
            limit: PURCHASE_LIMIT,
            cursor: null,
          });
    const dates = invoice ?? defaultInvoiceDates(month, card);
    const payments =
      invoice === null
        ? []
        : await data.repositories.cardInvoices.listPayments(card.financialSpaceId, invoice.id);
    return {
      cardId: card.id,
      referenceMonth: month,
      closingDate: dates.closingDate,
      dueDate: dates.dueDate,
      totalMinor: invoice?.totalMinor ?? 0,
      paidMinor: invoice?.paidMinor ?? 0,
      outstandingMinor: invoice === null ? 0 : outstandingMinor(invoice),
      state: invoiceState(invoice),
      payments: payments.map((payment) => ({
        id: payment.id,
        amountMinor: payment.amountMinor,
        paidOn: payment.paidOn,
        recordedAt: payment.recordedAt.toISOString(),
      })),
      version: invoice?.version ?? null,
      purchases: purchases.items.map(toTransactionResponse),
      hasMore: purchases.nextCursor !== null,
    };
  }

  server.get(
    '/financial-spaces/:spaceId/cards/:cardId/invoices/:month',
    async (request): Promise<CardInvoiceResponse> => {
      const user = requireAuthenticatedUser(request);
      const { card, month } = await requireCard(request, user.id);
      const invoice = await data.repositories.cardInvoices.findByMonth(
        card.financialSpaceId,
        card.id,
        month,
      );
      return toResponse(card, month, invoice);
    },
  );

  server.put(
    '/financial-spaces/:spaceId/cards/:cardId/invoices/:month/dates',
    async (request): Promise<CardInvoiceResponse> => {
      const user = requireAuthenticatedUser(request);
      const { card, month } = await requireCard(request, user.id);
      const input = parseInput(invoiceDatesSchema, request.body);
      const invoice = await updateInvoiceDates(data, {
        financialSpaceId: card.financialSpaceId,
        cardId: card.id,
        referenceMonth: month,
        actorUserId: user.id,
        expectedVersion: input.version,
        closingDate: input.closingDate,
        dueDate: input.dueDate,
      });
      return toResponse(card, month, invoice);
    },
  );

  server.post(
    '/financial-spaces/:spaceId/cards/:cardId/invoices/:month/payments',
    async (request, reply): Promise<CardInvoiceResponse> => {
      const user = requireAuthenticatedUser(request);
      const { card, month } = await requireCard(request, user.id);
      const input = parseInput(paymentSchema, request.body);
      const invoice = await payInvoice(data, {
        financialSpaceId: card.financialSpaceId,
        cardId: card.id,
        referenceMonth: month,
        actorUserId: user.id,
        ...input,
      });
      reply.status(201);
      return toResponse(card, month, invoice);
    },
  );

  server.delete(
    '/financial-spaces/:spaceId/cards/:cardId/invoices/:month/payments/:paymentId',
    async (request): Promise<CardInvoiceResponse> => {
      const user = requireAuthenticatedUser(request);
      const { card, month } = await requireCard(request, user.id);
      const { paymentId } = parseInput(paymentParamsSchema, request.params);
      if (!isUuid(paymentId)) {
        throw new InvoicePaymentNotFoundError();
      }
      const invoice = await removeInvoicePayment(data, {
        financialSpaceId: card.financialSpaceId,
        cardId: card.id,
        referenceMonth: month,
        paymentId,
        actorUserId: user.id,
      });
      return toResponse(card, month, invoice);
    },
  );

  server.get(
    '/financial-spaces/:spaceId/cards/:cardId/invoices',
    async (request): Promise<CardInvoiceSummaryList> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(cardParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
      );
      const card = isUuid(params.cardId)
        ? await data.repositories.cards.findInSpace(space.id, params.cardId)
        : null;
      if (card === null) {
        throw new CardNotFoundError();
      }
      const { fromMonth, months } = parseInput(summaryQuerySchema, request.query);
      const invoices = await data.repositories.cardInvoices.listForCard(space.id, card.id, {
        start: monthRange(fromMonth).start,
        endExclusive: monthRange(shiftMonth(fromMonth, months)).start,
      });
      return {
        items: Array.from({ length: months }, (_, index) => {
          const month = shiftMonth(fromMonth, index);
          const invoice = invoices.find((item) => item.referenceMonth === month) ?? null;
          const dates = invoice ?? defaultInvoiceDates(month, card);
          return {
            referenceMonth: month,
            closingDate: dates.closingDate,
            dueDate: dates.dueDate,
            totalMinor: invoice?.totalMinor ?? 0,
            paidMinor: invoice?.paidMinor ?? 0,
            outstandingMinor: invoice === null ? 0 : outstandingMinor(invoice),
            state: invoiceState(invoice),
          };
        }),
      };
    },
  );
}
