import type { Transaction } from '@personalfin/api-contract';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useDeletedTransactions, useRestoreTransaction } from '../../../../api/transactions';
import {
  transactionAmountLabel,
  transactionCategoryLabel,
  transactionDateLabel,
} from '../../../../features/transactions/transaction-presentation';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { Title } from '../../../../ui/Title';
import { fontSize, radius, spacing, usePalette } from '../../../../ui/theme';

function DeletedRow({
  transaction,
  restoring,
  onRestore,
}: {
  transaction: Transaction;
  restoring: boolean;
  onRestore: () => void;
}) {
  const palette = usePalette();
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <View style={styles.texts}>
        <Text style={[styles.description, { color: palette.text }]}>{transaction.description}</Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          {`${transactionDateLabel(transaction)} · ${transactionCategoryLabel(transaction)} · ${transactionAmountLabel(transaction)}`}
        </Text>
      </View>
      <Button
        label={messages.transactions.restoreLabel}
        accessibilityLabel={messages.transactions.restoreAction(transaction.description)}
        variant="link"
        loading={restoring}
        onPress={onRestore}
      />
    </View>
  );
}

export default function TrashScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const deleted = useDeletedTransactions(spaceId);
  const restore = useRestoreTransaction(spaceId);

  if (deleted.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.transactions.trashTitle}</Title>
      {restore.isSuccess && <StatusMessage>{messages.transactions.restored}</StatusMessage>}
      <FormError message={restore.isError ? messages.transactions.errors.restoreFailed : null} />
      {deleted.isError && <FormError message={messages.transactions.loadError} />}
      {deleted.isSuccess && deleted.data.items.length === 0 && (
        <BodyText muted>{messages.transactions.trashEmpty}</BodyText>
      )}
      {deleted.isSuccess &&
        deleted.data.items.map((transaction) => (
          <DeletedRow
            key={transaction.id}
            transaction={transaction}
            restoring={restore.isPending && restore.variables?.transactionId === transaction.id}
            onRestore={() =>
              restore.mutate({ transactionId: transaction.id, version: transaction.version })
            }
          />
        ))}
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
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
});
