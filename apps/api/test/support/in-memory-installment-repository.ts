import type {
  InstallmentPurchase,
  InstallmentRepository,
} from '../../src/modules/cards/card-installments.ts';
import type { FinancialTransaction } from '../../src/modules/transactions/transaction.ts';

export function createInMemoryInstallmentRepository(
  transactions: () => FinancialTransaction[],
): InstallmentRepository & { purchases: InstallmentPurchase[] } {
  const purchases: InstallmentPurchase[] = [];
  return {
    purchases,
    async create(purchase) {
      purchases.push(purchase);
    },
    async exists(financialSpaceId, purchaseId) {
      return purchases.some(
        (purchase) => purchase.financialSpaceId === financialSpaceId && purchase.id === purchaseId,
      );
    },
    async listCancellable(financialSpaceId, purchaseId, afterMonth) {
      return transactions()
        .filter(
          (item) =>
            item.financialSpaceId === financialSpaceId &&
            item.installment?.purchaseId === purchaseId &&
            item.deletedAt === null &&
            (item.cardPurchase?.invoiceMonth ?? '') > afterMonth,
        )
        .map((item) => item.id);
    },
    async softDelete(ids) {
      for (const item of transactions()) {
        if (ids.includes(item.id)) {
          item.deletedAt = new Date();
          item.version += 1;
        }
      }
    },
  };
}
