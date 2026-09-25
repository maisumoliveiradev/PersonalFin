import type { BackupRepository } from '../../src/modules/backup/backup.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

export function createInMemoryBackupRepository(
  transactions: () => readonly FinancialTransaction[],
): BackupRepository {
  return {
    async spaceTable(table, financialSpaceId) {
      if (table !== 'financial_transaction') {
        return [];
      }
      return transactions()
        .filter((transaction) => transaction.financialSpaceId === financialSpaceId)
        .map((transaction) => ({
          id: transaction.id,
          description: transaction.description,
          amount_minor: transaction.amountMinor,
          deleted_at: transaction.deletedAt?.toISOString() ?? null,
        }));
    },
    async personalTable() {
      return [];
    },
    async globalGoals() {
      return { goals: [], progress: [] };
    },
  };
}
