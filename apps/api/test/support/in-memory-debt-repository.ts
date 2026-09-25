import type { Debt, DebtPayment } from '../../src/modules/debts/debt.ts';
import type { DebtRepository } from '../../src/modules/debts/debt-repository.ts';

export function createInMemoryDebtRepository(): DebtRepository & {
  debts: Debt[];
  payments: (DebtPayment & { deleted: boolean })[];
} {
  const debts: Debt[] = [];
  const payments: (DebtPayment & { deleted: boolean })[] = [];
  return {
    debts,
    payments,
    async listForSpace(financialSpaceId) {
      return debts.filter((debt) => debt.financialSpaceId === financialSpaceId);
    },
    async findInSpace(financialSpaceId, debtId) {
      return (
        debts.find((debt) => debt.financialSpaceId === financialSpaceId && debt.id === debtId) ??
        null
      );
    },
    async create({ createdByUserId: _createdBy, ...debt }) {
      const created: Debt = {
        ...debt,
        archivedAt: null,
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, debts.length)),
        version: 1,
      };
      debts.push(created);
      return created;
    },
    async update(update) {
      const index = debts.findIndex(
        (debt) =>
          debt.financialSpaceId === update.financialSpaceId &&
          debt.id === update.debtId &&
          debt.version === update.expectedVersion,
      );
      const current = debts[index];
      if (current === undefined) {
        return null;
      }
      const updated: Debt = {
        ...current,
        name: update.name,
        installmentCount: update.installmentCount,
        installmentAmountMinor: update.installmentAmountMinor,
        firstDueDate: update.firstDueDate,
        archivedAt: update.archived ? (current.archivedAt ?? new Date()) : null,
        version: current.version + 1,
      };
      debts[index] = updated;
      return updated;
    },
    async listPayments(financialSpaceId, debtId) {
      return payments
        .filter(
          (payment) =>
            !payment.deleted &&
            payment.financialSpaceId === financialSpaceId &&
            (debtId === undefined || payment.debtId === debtId),
        )
        .map(({ deleted: _deleted, ...payment }) => payment)
        .sort((left, right) => left.paidOn.localeCompare(right.paidOn));
    },
    async recordPayment({ recordedByUserId: _recordedBy, ...payment }) {
      const created = { ...payment, recordedAt: new Date(), deleted: false };
      payments.push(created);
      const { deleted: _deleted, ...result } = created;
      return result;
    },
    async deletePayment(financialSpaceId, debtId, paymentId) {
      const payment = payments.find(
        (item) =>
          !item.deleted &&
          item.financialSpaceId === financialSpaceId &&
          item.debtId === debtId &&
          item.id === paymentId,
      );
      if (payment === undefined) {
        return null;
      }
      payment.deleted = true;
      const { deleted: _deleted, ...result } = payment;
      return result;
    },
  };
}
