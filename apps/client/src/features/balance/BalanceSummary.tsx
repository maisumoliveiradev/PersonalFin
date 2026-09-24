import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useBalanceSnapshots } from '../../api/balance';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';
import { balanceAmountLabel, balanceDateLabel } from './balance-presentation';

interface BalanceSummaryProps {
  spaceId: string;
}

export function BalanceSummary({ spaceId }: BalanceSummaryProps) {
  const palette = usePalette();
  const router = useRouter();
  const snapshots = useBalanceSnapshots(spaceId);
  const current = snapshots.data?.current ?? null;

  return (
    <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <SectionTitle>{messages.balance.title}</SectionTitle>
      {snapshots.isError && <FormError message={messages.balance.loadError} />}
      {snapshots.isSuccess && current === null && (
        <BodyText muted>{messages.balance.none}</BodyText>
      )}
      {current !== null && (
        <>
          <Text
            style={[
              styles.amount,
              { color: current.amountMinor < 0 ? palette.danger : palette.text },
            ]}
          >
            {balanceAmountLabel(current)}
          </Text>
          <BodyText muted>{messages.balance.observedOn(balanceDateLabel(current))}</BodyText>
        </>
      )}
      <BodyText muted>{messages.balance.explanation}</BodyText>
      <Button
        label={messages.balance.updateAction}
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/balance/new', params: { spaceId } })
        }
      />
      {current !== null && (
        <Button
          label={messages.balance.historyAction}
          variant="link"
          onPress={() =>
            router.push({ pathname: '/spaces/[spaceId]/balance', params: { spaceId } })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  amount: { fontSize: fontSize.title, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
