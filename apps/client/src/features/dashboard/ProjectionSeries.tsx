import { formatMoney, formatMonthLabel, type Month } from '@personalfin/domain';
import { StyleSheet, Text, View } from 'react-native';

import { useProjectionSeries } from '../../api/dashboard';
import { messages } from '../../i18n/messages';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

const MONTHS = 6;

interface ProjectionSeriesProps {
  spaceId: string;
  fromMonth: Month;
}

export function ProjectionSeries({ spaceId, fromMonth }: ProjectionSeriesProps) {
  const palette = usePalette();
  const series = useProjectionSeries(spaceId, fromMonth, MONTHS);

  if (!series.isSuccess || series.data.every((item) => item.projectedBalance === null)) {
    return null;
  }

  return (
    <View
      role="region"
      aria-label={messages.dashboard.seriesTitle}
      style={[styles.card, { borderColor: palette.border }]}
    >
      <SectionTitle>{messages.dashboard.seriesTitle}</SectionTitle>
      {series.data.map((item) => {
        const label = formatMonthLabel(item.month, 'pt-BR');
        const value =
          item.projectedBalance === null
            ? messages.dashboard.seriesNone
            : formatMoney({ amountMinor: item.projectedBalance, currency: 'BRL' }, 'pt-BR');
        const isNegative = item.projectedBalance !== null && item.projectedBalance < 0;
        return (
          <View key={item.month} style={styles.row} aria-label={`${label}: ${value}`}>
            <Text style={[styles.month, { color: palette.textMuted }]}>
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </Text>
            <Text style={[styles.value, { color: isNegative ? palette.danger : palette.text }]}>
              {value}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  month: { fontSize: fontSize.body },
  value: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
