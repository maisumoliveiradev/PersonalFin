import type { BalanceSnapshot } from '@personalfin/api-contract';
import { formatDisplayDate, formatMoney, isSupportedCurrency } from '@personalfin/domain';

export function balanceAmountLabel(snapshot: BalanceSnapshot): string {
  if (!isSupportedCurrency(snapshot.currency)) {
    return `${snapshot.currency} ${snapshot.amountMinor}`;
  }
  return formatMoney({ amountMinor: snapshot.amountMinor, currency: snapshot.currency }, 'pt-BR');
}

export function balanceDateLabel(snapshot: BalanceSnapshot): string {
  return formatDisplayDate(snapshot.observedOn, 'pt-BR');
}
