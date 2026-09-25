import type { MonthlyDashboard as MonthlyDashboardData } from '@personalfin/api-contract';
import {
  formatDisplayDate,
  formatMoney,
  isSupportedCurrency,
  type Month,
} from '@personalfin/domain';
import { StyleSheet, Text, View } from 'react-native';

import { useMonthlyDashboard } from '../../api/dashboard';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';
import { currentMonth } from '../transactions/transaction-filters';

function money(dashboard: MonthlyDashboardData, amountMinor: number): string {
  if (!isSupportedCurrency(dashboard.currency)) {
    return `${dashboard.currency} ${amountMinor}`;
  }
  return formatMoney({ amountMinor, currency: dashboard.currency }, 'pt-BR');
}

function MetricRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const palette = usePalette();
  return (
    <View style={styles.metric} aria-label={`${label}: ${value}`}>
      <Text style={[styles.metricLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: color ?? palette.text }]}>{value}</Text>
    </View>
  );
}

interface MonthlyDashboardProps {
  spaceId: string;
  month: Month;
}

export function MonthlyDashboard({ spaceId, month }: MonthlyDashboardProps) {
  const palette = usePalette();
  const dashboard = useMonthlyDashboard(spaceId, month);

  if (dashboard.isError) {
    return <FormError message={messages.dashboard.loadError} />;
  }
  if (!dashboard.isSuccess) {
    return null;
  }
  const data = dashboard.data;
  const largestCategory = data.realizedExpensesByCategory[0]?.amountMinor ?? 0;
  const isPastMonth = month < currentMonth();

  return (
    <View
      role="region"
      aria-label={messages.dashboard.title}
      style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}
    >
      <SectionTitle>{messages.dashboard.title}</SectionTitle>
      <MetricRow
        label={messages.dashboard.realizedIncome}
        value={money(data, data.realizedIncome)}
        color={palette.success}
      />
      <MetricRow
        label={messages.dashboard.realizedExpenses}
        value={money(data, data.realizedExpenses)}
      />
      <MetricRow
        label={messages.dashboard.realizedNet}
        value={money(data, data.realizedNet)}
        color={data.realizedNet < 0 ? palette.danger : palette.success}
      />
      <Text style={[styles.subheading, { color: palette.text }]}>
        {messages.dashboard.forecastTitle}
      </Text>
      <MetricRow
        label={messages.dashboard.forecastIncome}
        value={money(data, data.forecastIncome)}
      />
      <MetricRow
        label={messages.dashboard.forecastExpenses}
        value={money(data, data.forecastExpenses)}
      />
      <Text style={[styles.subheading, { color: palette.text }]}>
        {messages.dashboard.byCategoryTitle}
      </Text>
      {data.realizedExpensesByCategory.length === 0 && (
        <BodyText muted>{messages.dashboard.noExpenses}</BodyText>
      )}
      {data.realizedExpensesByCategory.map((category) => (
        <View key={category.categoryId} style={styles.categoryRow}>
          <MetricRow label={category.name} value={money(data, category.amountMinor)} />
          <View style={[styles.barTrack, { backgroundColor: palette.background }]}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: palette.primary,
                  width: `${largestCategory === 0 ? 0 : (category.amountMinor / largestCategory) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
      {isPastMonth && (
        <>
          <Text style={[styles.subheading, { color: palette.text }]}>
            {messages.dashboard.monthEndBalance}
          </Text>
          {data.observedBalance === null ? (
            <BodyText muted>{messages.dashboard.noMonthEndBalance}</BodyText>
          ) : (
            <MetricRow
              label={messages.dashboard.monthEndBalanceDate(
                formatDisplayDate(data.observedBalance.observedOn, 'pt-BR'),
              )}
              value={money(data, data.observedBalance.amountMinor)}
            />
          )}
        </>
      )}
      <Text style={[styles.subheading, { color: palette.text }]}>
        {messages.dashboard.projectionTitle}
      </Text>
      {data.projection === null ? (
        <BodyText muted>{messages.dashboard.noProjection}</BodyText>
      ) : (
        <>
          <MetricRow
            label={messages.dashboard.projectionBase(
              formatDisplayDate(data.projection.base.observedOn, 'pt-BR'),
            )}
            value={money(data, data.projection.base.amountMinor)}
          />
          <MetricRow
            label={messages.dashboard.projectionAfter}
            value={money(
              data,
              data.projection.afterObservation.income - data.projection.afterObservation.expenses,
            )}
          />
          <MetricRow
            label={messages.dashboard.projectionPending}
            value={money(
              data,
              data.projection.pendingUpToObservation.income -
                data.projection.pendingUpToObservation.expenses,
            )}
          />
          <MetricRow
            label={messages.dashboard.projectionInvoices}
            value={money(data, -data.projection.openInvoices)}
          />
          <MetricRow
            label={messages.dashboard.projectionInvoicePayments}
            value={money(data, -data.projection.invoicePayments)}
          />
          <MetricRow
            label={messages.dashboard.projectedBalance}
            value={money(data, data.projection.amountMinor)}
            color={data.projection.amountMinor < 0 ? palette.danger : palette.primary}
          />
        </>
      )}
      <BodyText muted>{messages.dashboard.definitionsHint}</BodyText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  metric: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  metricLabel: { flex: 1, fontSize: fontSize.body },
  metricValue: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  subheading: { fontSize: fontSize.body, fontWeight: '700', marginTop: spacing.xs },
  categoryRow: { gap: 4 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
});
