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

  return {
    transactions,
    async create(transaction) {
      const { categoryId, subcategoryId, ...rest } = transaction;
      const created: FinancialTransaction = {
        ...rest,
        category: reference(categoryId),
        subcategory: subcategoryId === null ? null : reference(subcategoryId),
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, transactions.length)),
      };
      transactions.push(created);
      return created;
    },
    async listRecentForSpace(financialSpaceId, limit) {
      return transactions
        .filter((transaction) => transaction.financialSpaceId === financialSpaceId)
        .sort(
          (left, right) =>
            right.financialDate.localeCompare(left.financialDate) ||
            right.createdAt.getTime() - left.createdAt.getTime(),
        )
        .slice(0, limit);
    },
  };
}
