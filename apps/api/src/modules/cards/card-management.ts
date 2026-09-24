import { randomUUID } from 'node:crypto';

import { DEFAULT_CURRENCY, type FinancialDate } from '@personalfin/domain';

import type { DataAccess } from '../../database/data-access.ts';
import { diffFields } from '../audit/audit-event.ts';
import { VersionConflictError } from '../transactions/update-transaction.ts';
import type { Card, CardLimitChange } from './card.ts';
import { CardNotFoundError } from './card-errors.ts';

export interface CreateCardInput {
  financialSpaceId: string;
  actorUserId: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limitMinor: number;
  limitEffectiveFrom: FinancialDate;
}

export async function createCard(
  data: DataAccess,
  input: CreateCardInput,
): Promise<{ card: Card; limits: CardLimitChange[] }> {
  return data.transaction(async ({ cards, audit }) => {
    const card = await cards.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      name: input.name,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
      createdByUserId: input.actorUserId,
    });
    const limit = await cards.recordLimitChange({
      id: randomUUID(),
      cardId: card.id,
      financialSpaceId: input.financialSpaceId,
      amountMinor: input.limitMinor,
      currency: DEFAULT_CURRENCY,
      effectiveFrom: input.limitEffectiveFrom,
      recordedByUserId: input.actorUserId,
    });
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'card',
      entityId: card.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        name: { before: null, after: card.name },
        closingDay: { before: null, after: card.closingDay },
        dueDay: { before: null, after: card.dueDay },
      },
    });
    return { card, limits: [limit] };
  });
}

export interface UpdateCardInput {
  financialSpaceId: string;
  cardId: string;
  actorUserId: string;
  expectedVersion: number;
  name?: string;
  closingDay?: number;
  dueDay?: number;
  archived?: boolean;
}

export async function updateCard(data: DataAccess, input: UpdateCardInput): Promise<Card> {
  return data.transaction(async ({ cards, audit }) => {
    const current = await cards.findInSpace(input.financialSpaceId, input.cardId, { lock: true });
    if (current === null) {
      throw new CardNotFoundError();
    }
    if (current.version !== input.expectedVersion) {
      throw new VersionConflictError();
    }
    const before = {
      name: current.name,
      closingDay: current.closingDay,
      dueDay: current.dueDay,
      archived: current.archivedAt !== null,
    };
    const after = {
      name: input.name ?? before.name,
      closingDay: input.closingDay ?? before.closingDay,
      dueDay: input.dueDay ?? before.dueDay,
      archived: input.archived ?? before.archived,
    };
    const changes = diffFields(before, after);
    if (Object.keys(changes).length === 0) {
      return current;
    }
    const updated = await cards.update({
      financialSpaceId: input.financialSpaceId,
      cardId: input.cardId,
      expectedVersion: input.expectedVersion,
      ...after,
    });
    if (updated === null) {
      throw new VersionConflictError();
    }
    await audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'card',
      entityId: input.cardId,
      action: 'update',
      actorUserId: input.actorUserId,
      changes,
    });
    return updated;
  });
}

export interface RecordCardLimitInput {
  financialSpaceId: string;
  cardId: string;
  actorUserId: string;
  amountMinor: number;
  effectiveFrom: FinancialDate;
}

export async function recordCardLimit(data: DataAccess, input: RecordCardLimitInput) {
  return data.transaction(async ({ cards }) => {
    const card = await cards.findInSpace(input.financialSpaceId, input.cardId, { lock: true });
    if (card === null) {
      throw new CardNotFoundError();
    }
    await cards.recordLimitChange({
      id: randomUUID(),
      cardId: card.id,
      financialSpaceId: input.financialSpaceId,
      amountMinor: input.amountMinor,
      currency: DEFAULT_CURRENCY,
      effectiveFrom: input.effectiveFrom,
      recordedByUserId: input.actorUserId,
    });
    return { card, limits: await cards.listLimitChanges(input.financialSpaceId, card.id) };
  });
}
