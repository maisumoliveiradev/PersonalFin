import type { CurrencyCode, FinancialDate, Month } from '@personalfin/domain';

export interface InstallmentPurchase {
  id: string;
  financialSpaceId: string;
  cardId: string;
  description: string;
  totalMinor: number;
  currency: CurrencyCode;
  installmentCount: number;
  purchaseDate: FinancialDate;
  firstInvoiceMonth: Month;
  createdByUserId: string;
}

export interface InstallmentRepository {
  create(purchase: InstallmentPurchase): Promise<void>;
  exists(financialSpaceId: string, purchaseId: string): Promise<boolean>;
  listCancellable(
    financialSpaceId: string,
    purchaseId: string,
    afterMonth: Month,
  ): Promise<string[]>;
  softDelete(ids: readonly string[], actorUserId: string): Promise<void>;
}
