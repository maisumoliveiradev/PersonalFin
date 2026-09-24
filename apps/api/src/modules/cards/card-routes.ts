import type {
  CardLimitChange as CardLimitChangeResponse,
  CardList,
  Card as CardResponse,
} from '@personalfin/api-contract';
import {
  CARD_NAME_MAX_LENGTH,
  isValidAmountMinor,
  isValidCardDay,
  isValidFinancialDate,
  MAX_AMOUNT_MINOR,
  MAX_CARD_DAY,
  MIN_CARD_DAY,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { type Card, type CardLimitChange, normalizeCardName } from './card.ts';
import { CardNotFoundError } from './card-errors.ts';
import { createCard, recordCardLimit, updateCard } from './card-management.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const cardParamsSchema = z.object({ spaceId: z.string(), cardId: z.string() });

const cardNameSchema = z
  .string()
  .transform(normalizeCardName)
  .pipe(z.string().min(1).max(CARD_NAME_MAX_LENGTH));
const cardDaySchema = z
  .number()
  .refine(isValidCardDay, `must be an integer from ${MIN_CARD_DAY} to ${MAX_CARD_DAY}`);
const limitSchema = z
  .number()
  .refine(isValidAmountMinor, `must be an integer from 1 to ${MAX_AMOUNT_MINOR}`);
const dateSchema = z.string().refine(isValidFinancialDate, 'must be a calendar date (YYYY-MM-DD)');

const createCardSchema = z.strictObject({
  name: cardNameSchema,
  closingDay: cardDaySchema,
  dueDay: cardDaySchema,
  limitMinor: limitSchema,
  limitEffectiveFrom: dateSchema,
});

const updateCardSchema = z.strictObject({
  version: z.number().int().min(1),
  name: cardNameSchema.optional(),
  closingDay: cardDaySchema.optional(),
  dueDay: cardDaySchema.optional(),
  archived: z.boolean().optional(),
});

const limitChangeSchema = z.strictObject({
  amountMinor: limitSchema,
  effectiveFrom: dateSchema,
});

function toLimitResponse(change: CardLimitChange): CardLimitChangeResponse {
  return {
    id: change.id,
    amountMinor: change.amountMinor,
    currency: change.currency,
    effectiveFrom: change.effectiveFrom,
    recordedAt: change.recordedAt.toISOString(),
  };
}

function toCardResponse(card: Card, limits: readonly CardLimitChange[]): CardResponse {
  return {
    id: card.id,
    name: card.name,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    archived: card.archivedAt !== null,
    version: card.version,
    limits: limits.filter((change) => change.cardId === card.id).map(toLimitResponse),
  };
}

function requireCardId(cardId: string): string {
  if (!isUuid(cardId)) {
    throw new CardNotFoundError();
  }
  return cardId;
}

export function registerCardRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get('/financial-spaces/:spaceId/cards', async (request): Promise<CardList> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(data.repositories.financialSpaces, user.id, spaceId);
    const [cards, limits] = await Promise.all([
      data.repositories.cards.listForSpace(space.id),
      data.repositories.cards.listLimitChanges(space.id),
    ]);
    return { items: cards.map((card) => toCardResponse(card, limits)) };
  });

  server.post('/financial-spaces/:spaceId/cards', async (request, reply): Promise<CardResponse> => {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(data.repositories.financialSpaces, user.id, spaceId);
    const input = parseInput(createCardSchema, request.body);
    const { card, limits } = await createCard(data, {
      financialSpaceId: space.id,
      actorUserId: user.id,
      ...input,
    });
    reply.status(201);
    return toCardResponse(card, limits);
  });

  server.get('/financial-spaces/:spaceId/cards/:cardId', async (request): Promise<CardResponse> => {
    const user = requireAuthenticatedUser(request);
    const params = parseInput(cardParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      params.spaceId,
    );
    const cardId = requireCardId(params.cardId);
    const card = await data.repositories.cards.findInSpace(space.id, cardId);
    if (card === null) {
      throw new CardNotFoundError();
    }
    return toCardResponse(card, await data.repositories.cards.listLimitChanges(space.id, cardId));
  });

  server.patch(
    '/financial-spaces/:spaceId/cards/:cardId',
    async (request): Promise<CardResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(cardParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
      );
      const input = parseInput(updateCardSchema, request.body);
      const card = await updateCard(data, {
        financialSpaceId: space.id,
        cardId: requireCardId(params.cardId),
        actorUserId: user.id,
        expectedVersion: input.version,
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.closingDay === undefined ? {} : { closingDay: input.closingDay }),
        ...(input.dueDay === undefined ? {} : { dueDay: input.dueDay }),
        ...(input.archived === undefined ? {} : { archived: input.archived }),
      });
      return toCardResponse(
        card,
        await data.repositories.cards.listLimitChanges(space.id, card.id),
      );
    },
  );

  server.post(
    '/financial-spaces/:spaceId/cards/:cardId/limit-changes',
    async (request, reply): Promise<CardResponse> => {
      const user = requireAuthenticatedUser(request);
      const params = parseInput(cardParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        params.spaceId,
      );
      const input = parseInput(limitChangeSchema, request.body);
      const { card, limits } = await recordCardLimit(data, {
        financialSpaceId: space.id,
        cardId: requireCardId(params.cardId),
        actorUserId: user.id,
        ...input,
      });
      reply.status(201);
      return toCardResponse(card, limits);
    },
  );
}
