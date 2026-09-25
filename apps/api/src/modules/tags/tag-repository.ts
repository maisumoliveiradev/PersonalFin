import type { NewTag, Tag } from './tag.ts';

export interface TagUpdate {
  financialSpaceId: string;
  tagId: string;
  expectedVersion: number;
  name: string;
  archived: boolean;
}

export interface TagRepository {
  listForSpace(financialSpaceId: string): Promise<Tag[]>;
  findInSpace(
    financialSpaceId: string,
    tagId: string,
    options?: { lock: boolean },
  ): Promise<Tag | null>;
  create(tag: NewTag): Promise<Tag>;
  update(update: TagUpdate): Promise<Tag | null>;
  delete(financialSpaceId: string, tagId: string, expectedVersion: number): Promise<boolean>;
  countUses(financialSpaceId: string, tagId: string): Promise<number>;
  tagIdsOf(financialSpaceId: string, transactionId: string): Promise<string[]>;
  setForTransaction(
    financialSpaceId: string,
    transactionId: string,
    tagIds: readonly string[],
  ): Promise<void>;
}
