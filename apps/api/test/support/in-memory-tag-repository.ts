import type { Tag } from '../../src/modules/tags/tag.ts';
import { TagNameTakenError } from '../../src/modules/tags/tag-errors.ts';
import type { TagRepository } from '../../src/modules/tags/tag-repository.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

export function createInMemoryTagRepository(
  transactions: () => FinancialTransaction[],
): TagRepository & { tags: Tag[] } {
  const tags: Tag[] = [];

  function assertUniqueName(financialSpaceId: string, tagId: string, name: string) {
    if (
      tags.some(
        (tag) =>
          tag.financialSpaceId === financialSpaceId &&
          tag.id !== tagId &&
          tag.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      throw new TagNameTakenError();
    }
  }

  function find(financialSpaceId: string, tagId: string) {
    return tags.find((tag) => tag.financialSpaceId === financialSpaceId && tag.id === tagId);
  }

  return {
    tags,
    async listForSpace(financialSpaceId) {
      return tags
        .filter((tag) => tag.financialSpaceId === financialSpaceId)
        .sort(
          (left, right) =>
            Number(left.archivedAt !== null) - Number(right.archivedAt !== null) ||
            left.name.toLowerCase().localeCompare(right.name.toLowerCase()),
        );
    },
    async findInSpace(financialSpaceId, tagId) {
      return find(financialSpaceId, tagId) ?? null;
    },
    async create({ createdByUserId: _createdBy, ...tag }) {
      assertUniqueName(tag.financialSpaceId, tag.id, tag.name);
      const created: Tag = { ...tag, archivedAt: null, version: 1 };
      tags.push(created);
      return created;
    },
    async update({ financialSpaceId, tagId, expectedVersion, name, archived }) {
      const current = find(financialSpaceId, tagId);
      if (current === undefined || current.version !== expectedVersion) {
        return null;
      }
      assertUniqueName(financialSpaceId, tagId, name);
      Object.assign(current, {
        name,
        archivedAt: archived ? (current.archivedAt ?? new Date()) : null,
        version: current.version + 1,
      });
      for (const transaction of transactions()) {
        for (const reference of transaction.tags) {
          if (reference.id === tagId) {
            reference.name = name;
          }
        }
      }
      return current;
    },
    async delete(financialSpaceId, tagId, expectedVersion) {
      const index = tags.findIndex(
        (tag) =>
          tag.financialSpaceId === financialSpaceId &&
          tag.id === tagId &&
          tag.version === expectedVersion,
      );
      if (index < 0) {
        return false;
      }
      tags.splice(index, 1);
      return true;
    },
    async countUses(financialSpaceId, tagId) {
      return transactions().filter(
        (transaction) =>
          transaction.financialSpaceId === financialSpaceId &&
          transaction.tags.some((tag) => tag.id === tagId),
      ).length;
    },
    async tagIdsOf(financialSpaceId, transactionId) {
      const transaction = transactions().find(
        (item) => item.financialSpaceId === financialSpaceId && item.id === transactionId,
      );
      return (transaction?.tags ?? []).map((tag) => tag.id).sort();
    },
    async setForTransaction(financialSpaceId, transactionId, tagIds) {
      const transaction = transactions().find(
        (item) => item.financialSpaceId === financialSpaceId && item.id === transactionId,
      );
      if (transaction === undefined) {
        return;
      }
      transaction.tags = tagIds
        .map((tagId) => find(financialSpaceId, tagId))
        .filter((tag): tag is Tag => tag !== undefined)
        .map((tag) => ({ id: tag.id, name: tag.name }))
        .sort((left, right) => left.name.toLowerCase().localeCompare(right.name.toLowerCase()));
    },
  };
}
