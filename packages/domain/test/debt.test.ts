import { describe, expect, it } from 'vitest';

import { type DebtPlan, simulatePrepayment, summarizeDebt } from '../src/debt.ts';

const plan: DebtPlan = {
  originalAmountMinor: 1_000_000,
  installmentCount: 10,
  installmentAmountMinor: 100_000,
  firstDueDate: '2026-01-31',
};

describe('debt summary', () => {
  it('starts with everything outstanding and the first due date next', () => {
    expect(summarizeDebt(plan, [])).toEqual({
      paidMinor: 0,
      outstandingMinor: 1_000_000,
      paidInstallments: 0,
      remainingInstallments: 10,
      lastInstallmentMinor: 100_000,
      nextDueDate: '2026-01-31',
      progressTenths: 0,
      settled: false,
    });
  });

  it('counts installments and moves the due date with month-end clamping', () => {
    const summary = summarizeDebt(plan, [
      { kind: 'installment', amountMinor: 100_000 },
      { kind: 'installment', amountMinor: 100_000 },
    ]);
    expect(summary).toMatchObject({
      paidMinor: 200_000,
      outstandingMinor: 800_000,
      paidInstallments: 2,
      remainingInstallments: 8,
      nextDueDate: '2026-03-31',
      progressTenths: 200,
    });
    expect(summarizeDebt(plan, [{ kind: 'installment', amountMinor: 100_000 }]).nextDueDate).toBe(
      '2026-02-28',
    );
  });

  it('lets the last installment absorb the difference', () => {
    const uneven = { ...plan, originalAmountMinor: 1_000_050 };
    expect(summarizeDebt(uneven, []).lastInstallmentMinor).toBe(100_050);
    const prepaid = summarizeDebt(plan, [{ kind: 'prepayment', amountMinor: 250_000 }]);
    expect(prepaid).toMatchObject({
      outstandingMinor: 750_000,
      remainingInstallments: 8,
      lastInstallmentMinor: 50_000,
    });
  });

  it('rounds progress down so 100% means fully paid', () => {
    const almost = summarizeDebt(plan, [{ kind: 'prepayment', amountMinor: 999_999 }]);
    expect(almost.progressTenths).toBe(999);
    const paid = summarizeDebt(plan, [{ kind: 'prepayment', amountMinor: 1_000_000 }]);
    expect(paid).toMatchObject({
      outstandingMinor: 0,
      remainingInstallments: 0,
      lastInstallmentMinor: null,
      nextDueDate: null,
      progressTenths: 1000,
      settled: true,
    });
  });
});

describe('prepayment simulation (DR-093)', () => {
  const paidTwo = [
    { kind: 'installment' as const, amountMinor: 100_000 },
    { kind: 'installment' as const, amountMinor: 100_000 },
  ];

  it('reduces the term keeping the installment', () => {
    const simulation = simulatePrepayment(plan, paidTwo, 250_000, 'reduce_term');
    expect(simulation.plan).toEqual({ installmentCount: 8, installmentAmountMinor: 100_000 });
    expect(simulation.before.remainingInstallments).toBe(8);
    expect(simulation.after).toMatchObject({
      outstandingMinor: 550_000,
      paidInstallments: 2,
      remainingInstallments: 6,
      lastInstallmentMinor: 50_000,
      nextDueDate: '2026-03-31',
    });
  });

  it('reduces the installment keeping the remaining count, last one absorbing cents', () => {
    const simulation = simulatePrepayment(plan, paidTwo, 250_001, 'reduce_installment');
    expect(simulation.plan).toEqual({ installmentCount: 10, installmentAmountMinor: 68_749 });
    expect(simulation.after).toMatchObject({
      outstandingMinor: 549_999,
      remainingInstallments: 8,
      lastInstallmentMinor: 68_756,
    });
  });

  it('settles the debt when the prepayment covers the balance', () => {
    const simulation = simulatePrepayment(plan, paidTwo, 800_000, 'reduce_installment');
    expect(simulation.after).toMatchObject({ outstandingMinor: 0, settled: true });
    expect(simulation.plan.installmentCount).toBe(2);
  });

  it('never simulates more than the outstanding balance or a non-positive amount', () => {
    expect(() => simulatePrepayment(plan, paidTwo, 800_001, 'reduce_term')).toThrow(RangeError);
    expect(() => simulatePrepayment(plan, paidTwo, 0, 'reduce_term')).toThrow(RangeError);
  });

  it('handles balances smaller than the remaining count', () => {
    const small = { ...plan, originalAmountMinor: 1_000, installmentAmountMinor: 100 };
    const simulation = simulatePrepayment(small, [], 995, 'reduce_installment');
    expect(simulation.plan).toEqual({ installmentCount: 5, installmentAmountMinor: 1 });
    expect(simulation.after).toMatchObject({ outstandingMinor: 5, remainingInstallments: 5 });
  });
});
