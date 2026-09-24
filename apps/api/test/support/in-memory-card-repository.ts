import type { Card, CardLimitChange } from '../../src/modules/cards/card.ts';
import { CardNameTakenError } from '../../src/modules/cards/card-errors.ts';
import type { CardRepository } from '../../src/modules/cards/card-repository.ts';

export function createInMemoryCardRepository(): CardRepository & {
  cards: Card[];
  limitChanges: CardLimitChange[];
} {
  const cards: Card[] = [];
  const limitChanges: CardLimitChange[] = [];

  function assertUniqueName(financialSpaceId: string, cardId: string, name: string) {
    const clash = cards.some(
      (card) =>
        card.financialSpaceId === financialSpaceId &&
        card.id !== cardId &&
        card.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      throw new CardNameTakenError();
    }
  }

  return {
    cards,
    limitChanges,
    async listForSpace(financialSpaceId) {
      return cards
        .filter((card) => card.financialSpaceId === financialSpaceId)
        .sort(
          (left, right) =>
            Number(left.archivedAt !== null) - Number(right.archivedAt !== null) ||
            left.name.toLowerCase().localeCompare(right.name.toLowerCase()),
        );
    },
    async findInSpace(financialSpaceId, cardId) {
      return (
        cards.find((card) => card.financialSpaceId === financialSpaceId && card.id === cardId) ??
        null
      );
    },
    async create({ createdByUserId: _createdBy, ...card }) {
      assertUniqueName(card.financialSpaceId, card.id, card.name);
      const created: Card = { ...card, archivedAt: null, version: 1 };
      cards.push(created);
      return created;
    },
    async update({ financialSpaceId, cardId, expectedVersion, archived, ...fields }) {
      const index = cards.findIndex(
        (card) =>
          card.financialSpaceId === financialSpaceId &&
          card.id === cardId &&
          card.version === expectedVersion,
      );
      const current = cards[index];
      if (current === undefined) {
        return null;
      }
      assertUniqueName(financialSpaceId, cardId, fields.name);
      const updated: Card = {
        ...current,
        ...fields,
        archivedAt: archived ? (current.archivedAt ?? new Date()) : null,
        version: current.version + 1,
      };
      cards[index] = updated;
      return updated;
    },
    async recordLimitChange(change) {
      const recorded = {
        ...change,
        recordedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, limitChanges.length)),
      };
      limitChanges.push(recorded);
      return recorded;
    },
    async listLimitChanges(financialSpaceId, cardId) {
      return limitChanges
        .filter(
          (change) =>
            change.financialSpaceId === financialSpaceId &&
            (cardId === undefined || change.cardId === cardId),
        )
        .sort(
          (left, right) =>
            right.effectiveFrom.localeCompare(left.effectiveFrom) ||
            right.recordedAt.getTime() - left.recordedAt.getTime(),
        );
    },
  };
}
