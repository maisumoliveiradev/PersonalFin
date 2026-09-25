import { formatMoney, formatMonthLabel, type Month, shiftMonth } from '@personalfin/domain';
import { StyleSheet, Text, View } from 'react-native';

import { useEvolution } from '../../api/analytics';
import { messages } from '../../i18n/messages';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

const MONTHS = 12;

function money(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

export function EvolutionCard({ spaceId, throughMonth }: { spaceId: string; throughMonth: Month }) {
  const palette = usePalette();
  const evolution = useEvolution(spaceId, shiftMonth(throughMonth, -(MONTHS - 1)), MONTHS);

  if (evolution.isError) {
    return <FormError message={messages.analytics.loadError} />;
  }
  if (!evolution.isSuccess) {
    return null;
  }
  const largest = Math.max(
    1,
    ...evolution.data.flatMap((item) => [item.realizedIncome, item.realizedExpenses]),
  );

  return (
    <View
      role="region"
      aria-label={messages.analytics.evolutionTitle}
      style={[styles.card, { borderColor: palette.border }]}
    >
      <SectionTitle>{messages.analytics.evolutionTitle}</SectionTitle>
      {evolution.data.map((item) => {
        const label = formatMonthLabel(item.month, 'pt-BR');
        const summary = messages.analytics.evolutionRow(
          money(item.realizedIncome),
          money(item.realizedExpenses),
          money(item.realizedNet),
        );
        return (
          <View key={item.month} style={styles.item} aria-label={`${label}: ${summary}`}>
            <Text style={[styles.month, { color: palette.text }]}>
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </Text>
            <Text style={[styles.summary, { color: palette.textMuted }]}>{summary}</Text>
            <View style={[styles.track, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: palette.success,
                    width: `${(item.realizedIncome / largest) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={[styles.track, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: palette.danger,
                    width: `${(item.realizedExpenses / largest) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  item: { gap: 2 },
  month: { fontSize: fontSize.body, fontWeight: '600' },
  summary: { fontSize: fontSize.caption, fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6 },
});
