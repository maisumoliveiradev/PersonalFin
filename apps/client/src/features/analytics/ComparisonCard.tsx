import type { Comparison } from '@personalfin/api-contract';
import { formatMoney, formatMonthLabel, formatPercentTenths } from '@personalfin/domain';
import { StyleSheet, Text, View } from 'react-native';

import { useComparison } from '../../api/analytics';
import { messages } from '../../i18n/messages';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

type Metric = keyof Comparison['current'];

const METRICS: { key: Metric; label: string }[] = [
  { key: 'realizedIncome', label: messages.dashboard.realizedIncome },
  { key: 'realizedExpenses', label: messages.dashboard.realizedExpenses },
  { key: 'realizedNet', label: messages.dashboard.realizedNet },
  { key: 'forecastIncome', label: messages.dashboard.forecastIncome },
  { key: 'forecastExpenses', label: messages.dashboard.forecastExpenses },
];

function money(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

function changeLabel(change: Comparison['previousMonth']['changes'][Metric]): string {
  const difference = `${change.difference > 0 ? '+' : ''}${money(change.difference)}`;
  return change.percentChangeTenths === null
    ? difference
    : `${difference} (${formatPercentTenths(change.percentChangeTenths, 'pt-BR')})`;
}

export function ComparisonCard({ spaceId, month }: { spaceId: string; month: string }) {
  const palette = usePalette();
  const comparison = useComparison(spaceId, month);

  if (comparison.isError) {
    return <FormError message={messages.analytics.loadError} />;
  }
  if (!comparison.isSuccess) {
    return null;
  }
  const data = comparison.data;
  const previousMonth = formatMonthLabel(data.previousMonth.month, 'pt-BR');
  const previousYear = formatMonthLabel(data.previousYear.month, 'pt-BR');

  return (
    <View
      role="region"
      aria-label={messages.analytics.comparisonTitle}
      style={[styles.card, { borderColor: palette.border }]}
    >
      <SectionTitle>{messages.analytics.comparisonTitle}</SectionTitle>
      {METRICS.map(({ key, label }) => {
        const vsMonth = messages.analytics.versus(
          previousMonth,
          changeLabel(data.previousMonth.changes[key]),
        );
        const vsYear = messages.analytics.versus(
          previousYear,
          changeLabel(data.previousYear.changes[key]),
        );
        return (
          <View
            key={key}
            style={styles.metric}
            aria-label={`${label}: ${money(data.current[key])}; ${vsMonth}; ${vsYear}`}
          >
            <View style={styles.row}>
              <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
              <Text style={[styles.value, { color: palette.text }]}>
                {money(data.current[key])}
              </Text>
            </View>
            <Text style={[styles.change, { color: palette.textMuted }]}>{vsMonth}</Text>
            <Text style={[styles.change, { color: palette.textMuted }]}>{vsYear}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  metric: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  label: { fontSize: fontSize.body },
  value: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  change: { fontSize: fontSize.caption },
});
