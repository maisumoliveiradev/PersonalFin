import type { RecurrenceSeries } from '@personalfin/api-contract';
import { formatDisplayDate, formatMoney, isSupportedCurrency } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useRecurrences } from '../../../../api/recurrences';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { Title } from '../../../../ui/Title';
import { fontSize, radius, spacing, usePalette } from '../../../../ui/theme';

const FREQUENCY_LABELS = {
  monthly: messages.recurrences.monthly,
  weekly: messages.recurrences.weekly,
  yearly: messages.recurrences.yearly,
} as const;

function seriesSummary(series: RecurrenceSeries): string {
  const start = messages.recurrences.since(formatDisplayDate(series.startDate, 'pt-BR'));
  const end =
    series.endDate === null
      ? messages.recurrences.noEnd
      : messages.recurrences.until(formatDisplayDate(series.endDate, 'pt-BR'));
  return `${FREQUENCY_LABELS[series.frequency]} · ${start} · ${end}`;
}

function seriesAmount(series: RecurrenceSeries): string {
  if (!isSupportedCurrency(series.currency)) {
    return `${series.currency} ${series.amountMinor}`;
  }
  const formatted = formatMoney(
    { amountMinor: series.amountMinor, currency: series.currency },
    'pt-BR',
  );
  return series.type === 'expense' ? `−${formatted}` : `+${formatted}`;
}

export default function RecurrencesScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const recurrences = useRecurrences(spaceId);

  if (recurrences.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.recurrences.listTitle}</Title>
      {recurrences.isError && <FormError message={messages.categories.loadError} />}
      {recurrences.isSuccess && recurrences.data.length === 0 && (
        <BodyText muted>{messages.recurrences.empty}</BodyText>
      )}
      {recurrences.isSuccess &&
        recurrences.data.map((series) => (
          <View key={series.id} style={[styles.row, { borderColor: palette.border }]}>
            <View style={styles.texts}>
              <Text style={[styles.description, { color: palette.text }]}>
                {series.description}
              </Text>
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                {seriesSummary(series)}
              </Text>
            </View>
            <Text
              style={[
                styles.amount,
                { color: series.type === 'income' ? palette.success : palette.text },
              ]}
            >
              {seriesAmount(series)}
            </Text>
          </View>
        ))}
      <Button label={messages.spaces.backToSpace} variant="link" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    gap: spacing.sm,
  },
  texts: { flex: 1, gap: 2 },
  description: { fontSize: fontSize.body, fontWeight: '600' },
  meta: { fontSize: fontSize.caption },
  amount: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
