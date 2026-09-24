import type { Category } from '../../src/modules/categories/category.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';
import type { TransactionRepository } from '../../src/modules/transactions/transaction-repository.ts';

export function createInMemoryTransactionRepository(
  categories: readonly Category[],
): TransactionRepository & { transactions: FinancialTransaction[] } {
  const transactions: FinancialTransaction[] = [];

  function reference(categoryId: string) {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (category === undefined) {
      throw new Error(`Unknown category ${categoryId}`);
    }
    return { id: category.id, name: category.name };
  }

  function find(financialSpaceId: string, transactionId: string) {
    return transactions.find(
      (transaction) =>
        transaction.financialSpaceId === financialSpaceId && transaction.id === transactionId,
    );
  }

  return {
    transactions,
    async create(transaction) {
      const { categoryId, subcategoryId, ...rest } = transaction;
      const created: FinancialTransaction = {
        ...rest,
        category: reference(categoryId),
        subcategory: subcategoryId === null ? null : reference(subcategoryId),
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, transactions.length)),
        version: 1,
        deletedAt: null,
      };
      transactions.push(created);
      return created;
    },
    async listRecentForSpace(financialSpaceId, limit) {
      return transactions
        .filter(
          (transaction) =>
            transaction.financialSpaceId === financialSpaceId && transaction.deletedAt === null,
        )
        .sort(
          (left, right) =>
            right.financialDate.localeCompare(left.financialDate) ||
            right.createdAt.getTime() - left.createdAt.getTime(),
        )
        .slice(0, limit);
    },
    async findInSpace(financialSpaceId, transactionId) {
      return find(financialSpaceId, transactionId) ?? null;
    },
    async update({ financialSpaceId, transactionId, expectedVersion, fields }) {
      const current = find(financialSpaceId, transactionId);
      if (
        current === undefined ||
        current.version !== expectedVersion ||
        current.deletedAt !== null
      ) {
        return null;
      }
      const { categoryId, subcategoryId, ...rest } = fields;
      Object.assign(current, rest, {
        category: reference(categoryId),
        subcategory: subcategoryId === null ? null : reference(subcategoryId),
        version: current.version + 1,
      });
      return current;
    },
    async setDeleted({ financialSpaceId, transactionId, expectedVersion, deleted }) {
      const current = find(financialSpaceId, transactionId);
      if (
        current === undefined ||
        current.version !== expectedVersion ||
        (current.deletedAt !== null) === deleted
      ) {
        return null;
      }
      current.deletedAt = deleted ? new Date() : null;
      current.version += 1;
      return current;
    },
    async listDeletedForSpace(financialSpaceId, limit) {
      return transactions
        .filter(
          (transaction) =>
            transaction.financialSpaceId === financialSpaceId && transaction.deletedAt !== null,
        )
        .slice(0, limit);
    },
  };
}
