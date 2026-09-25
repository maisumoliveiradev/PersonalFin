export interface Change {
  difference: number;
  percentChangeTenths: number | null;
}

function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n;
  const magnitude = negative ? -numerator : numerator;
  const rounded = (magnitude * 2n + denominator) / (denominator * 2n);
  return negative ? -rounded : rounded;
}

export function compareAmounts(current: number, base: number): Change {
  const difference = current - base;
  if (base === 0) {
    return { difference, percentChangeTenths: null };
  }
  const denominator = BigInt(Math.abs(base));
  return {
    difference,
    percentChangeTenths: Number(roundHalfAwayFromZero(BigInt(difference) * 1000n, denominator)),
  };
}

export function formatPercentTenths(tenths: number, locale: 'pt-BR' | 'en'): string {
  const sign = tenths > 0 ? '+' : '';
  const value = (tenths / 10).toFixed(1);
  return `${sign}${locale === 'pt-BR' ? value.replace('.', ',') : value}%`;
}
