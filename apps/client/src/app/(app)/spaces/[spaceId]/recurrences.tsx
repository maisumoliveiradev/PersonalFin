import type { RecurrenceSeries } from '@personalfin/api-contract';
import {
  financialDateFromLocalClock,
  formatDisplayDate,
  formatMoney,
  isSupportedCurrency,
  parseDisplayDate,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useEndRecurrence, useRecurrences } from '../../../../api/recurrences';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { TextField } from '../../../../ui/TextField';
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

interface SeriesRowProps {
  series: RecurrenceSeries;
  ending: boolean;
  onStartEnd: () => void;
  onCancelEnd: () => void;
  onEnd: (endDate: string) => Promise<void>;
}

function SeriesRow({ series, ending, onStartEnd, onCancelEnd, onEnd }: SeriesRowProps) {
  const palette = usePalette();
  const [lastDay, setLastDay] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    const endDate = parseDisplayDate(lastDay, 'pt-BR');
    if (endDate === null) {
      setError(messages.recurrences.errors.endDateInvalid);
      return;
    }
    if (endDate < series.startDate) {
      setError(messages.recurrences.errors.endBeforeStart);
      return;
    }
    setError(null);
    try {
      await onEnd(endDate);
    } catch {
      return;
    }
  }

  return (
    <View style={[styles.card, { borderColor: palette.border }]}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={[styles.description, { color: palette.text }]}>{series.description}</Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>{seriesSummary(series)}</Text>
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
      {ending ? (
        <>
          <TextField
            label={messages.recurrences.lastDayLabel}
            value={lastDay}
            onChangeText={setLastDay}
            inputMode="numeric"
            maxLength={10}
          />
          <FormError message={error} />
          <Button
            label={messages.recurrences.confirmEndAction}
            variant="danger"
            onPress={confirm}
          />
          <Button label={messages.recurrences.keepAction} variant="link" onPress={onCancelEnd} />
        </>
      ) : (
        <Button
          label={messages.recurrences.endAction}
          accessibilityLabel={`${messages.recurrences.endAction}: ${series.description}`}
          variant="link"
          onPress={onStartEnd}
        />
      )}
    </View>
  );
}

export default function RecurrencesScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const recurrences = useRecurrences(spaceId);
  const endRecurrence = useEndRecurrence(spaceId);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [endedCount, setEndedCount] = useState<number | null>(null);

  if (recurrences.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.recurrences.listTitle}</Title>
      {endedCount !== null && (
        <StatusMessage>{messages.recurrences.ended(endedCount)}</StatusMessage>
      )}
      <FormError message={endRecurrence.isError ? messages.recurrences.errors.endFailed : null} />
      {recurrences.isError && <FormError message={messages.categories.loadError} />}
      {recurrences.isSuccess && recurrences.data.length === 0 && (
        <BodyText muted>{messages.recurrences.empty}</BodyText>
      )}
      {recurrences.isSuccess &&
        recurrences.data.map((series) => (
          <SeriesRow
            key={series.id}
            series={series}
            ending={endingId === series.id}
            onStartEnd={() => setEndingId(series.id)}
            onCancelEnd={() => setEndingId(null)}
            onEnd={async (endDate) => {
              const result = await endRecurrence.mutateAsync({
                seriesId: series.id,
                version: series.version,
                endDate,
              });
              setEndingId(null);
              setEndedCount(result.occurrencesAffected);
            }}
          />
        ))}
      <Button label={messages.spaces.backToSpace} variant="link" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  texts: { flex: 1, gap: 2 },
  description: { fontSize: fontSize.body, fontWeight: '600' },
  meta: { fontSize: fontSize.caption },
  amount: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
