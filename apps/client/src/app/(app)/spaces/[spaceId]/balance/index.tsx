import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useBalanceSnapshots } from '../../../../../api/balance';
import {
  balanceAmountLabel,
  balanceDateLabel,
} from '../../../../../features/balance/balance-presentation';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { Title } from '../../../../../ui/Title';
import { fontSize, radius, spacing, usePalette } from '../../../../../ui/theme';

export default function BalanceHistoryScreen() {
  const palette = usePalette();
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const snapshots = useBalanceSnapshots(spaceId);

  if (snapshots.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.balance.historyTitle}</Title>
      <BodyText muted>{messages.balance.historyHint}</BodyText>
      {snapshots.isError && <FormError message={messages.balance.loadError} />}
      {snapshots.isSuccess && snapshots.data.items.length === 0 && (
        <BodyText muted>{messages.balance.historyEmpty}</BodyText>
      )}
      {snapshots.isSuccess &&
        snapshots.data.items.map((snapshot) => (
          <View key={snapshot.id} style={[styles.row, { borderColor: palette.border }]}>
            <View style={styles.texts}>
              <Text style={[styles.date, { color: palette.text }]}>
                {balanceDateLabel(snapshot)}
              </Text>
              {snapshot.note !== null && (
                <Text style={[styles.note, { color: palette.textMuted }]}>{snapshot.note}</Text>
              )}
            </View>
            <Text
              style={[
                styles.amount,
                { color: snapshot.amountMinor < 0 ? palette.danger : palette.text },
              ]}
            >
              {balanceAmountLabel(snapshot)}
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
  date: { fontSize: fontSize.body, fontWeight: '600' },
  note: { fontSize: fontSize.caption },
  amount: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
