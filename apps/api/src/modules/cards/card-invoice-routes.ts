import type { CardInvoice as CardInvoiceResponse } from '@personalfin/api-contract';
import { defaultInvoiceDates, isValidFinancialDate, isValidMonth } from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { toTransactionResponse } from '../transactions/transaction-routes.ts';
import type { Card } from './card.ts';
import { CardNotFoundError } from './card-errors.ts';
import type { CardInvoice } from './card-invoice.ts';
import { updateInvoiceDates } from './card-invoice-management.ts';

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
    return {
      cardId: card.id,
      referenceMonth: month,
      closingDate: dates.closingDate,
      dueDate: dates.dueDate,
      totalMinor: invoice?.totalMinor ?? 0,
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
}
