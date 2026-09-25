import { describe, expect, it } from 'vitest';

import { computeProjection } from '../src/modules/dashboard/dashboard.ts';

describe('computeProjection', () => {
  it('combines the observed base, later movements, and pending items up to it', () => {
    expect(
      computeProjection(
        { amountMinor: -15_075, observedOn: '2026-02-27' },
        {
          afterObservation: { income: 1_000, expenses: 250 },
          pendingUpToObservation: { income: 0, expenses: 2_000 },
          openInvoices: 3_000,
          invoicePayments: 1_000,
        },
      ).amountMinor,
    ).toBe(-15_075 + 750 - 2_000 - 3_000 - 1_000);
  });
});
