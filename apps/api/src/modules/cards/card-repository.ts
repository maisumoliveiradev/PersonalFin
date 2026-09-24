import type { Card, CardLimitChange, NewCard, NewCardLimitChange } from './card.ts';

export interface CardUpdate {
  financialSpaceId: string;
  cardId: string;
  expectedVersion: number;
  name: string;
  closingDay: number;
  dueDay: number;
  archived: boolean;
}

export interface CardRepository {
  listForSpace(financialSpaceId: string): Promise<Card[]>;
  findInSpace(
    financialSpaceId: string,
    cardId: string,
    options?: { lock: boolean },
  ): Promise<Card | null>;
  create(card: NewCard): Promise<Card>;
  update(update: CardUpdate): Promise<Card | null>;
  recordLimitChange(change: NewCardLimitChange): Promise<CardLimitChange>;
  listLimitChanges(financialSpaceId: string, cardId?: string): Promise<CardLimitChange[]>;
}
