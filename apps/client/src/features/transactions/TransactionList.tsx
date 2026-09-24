import type { Transaction } from '@personalfin/api-contract';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTransactions } from '../../api/transactions';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';
import {
  transactionAmountLabel,
  transactionCategoryLabel,
  transactionDateLabel,
  transactionStatusLabel,
  transactionTypeLabel,
} from './transaction-presentation';

function TransactionRow({ spaceId, transaction }: { spaceId: string; transaction: Transaction }) {
  const palette = usePalette();
  const router = useRouter();
  const amount = transactionAmountLabel(transaction);
  const category = transactionCategoryLabel(transaction);
  const date = transactionDateLabel(transaction);
  const status = transactionStatusLabel(transaction);
  const isPending = transaction.status === 'pending';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={messages.transactions.editHint}
      onPress={() =>
        router.push({
          pathname: '/spaces/[spaceId]/transactions/[transactionId]/edit',
          params: { spaceId, transactionId: transaction.id },
        })
      }
      accessibilityLabel={messages.transactions.rowAccessibilityLabel({
        type: transactionTypeLabel(transaction),
        description: transaction.description,
        amount,
        date,
        category,
        status,
      })}
      style={({ pressed }) => [
        styles.row,
        { borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.main}>
        <Text style={[styles.description, { color: palette.text }]}>{transaction.description}</Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>{`${date} · ${category}`}</Text>
      </View>
      <View style={styles.trailing}>
        <Text
          style={[
            styles.amount,
            { color: transaction.type === 'income' ? palette.success : palette.text },
          ]}
        >
          {amount}
        </Text>
        <Text style={[styles.status, { color: isPending ? palette.primary : palette.textMuted }]}>
          {status}
        </Text>
      </View>
    </Pressable>
  );
}

interface TransactionListProps {
  spaceId: string;
}

export function TransactionList({ spaceId }: TransactionListProps) {
  const palette = usePalette();
  const transactions = useTransactions(spaceId);

  return (
    <View style={styles.container}>
      <SectionTitle>{messages.transactions.listTitle}</SectionTitle>
      {transactions.isPending && (
        <ActivityIndicator accessibilityLabel={messages.common.loading} color={palette.primary} />
      )}
      {transactions.isError && (
        <>
          <FormError message={messages.transactions.loadError} />
          <Button label={messages.common.retry} onPress={() => transactions.refetch()} />
        </>
      )}
      {transactions.isSuccess && transactions.data.items.length === 0 && (
        <BodyText muted>{messages.transactions.empty}</BodyText>
      )}
      {transactions.isSuccess &&
        transactions.data.items.map((transaction) => (
          <TransactionRow key={transaction.id} spaceId={spaceId} transaction={transaction} />
        ))}
      {transactions.isSuccess && transactions.data.hasMore && (
        <BodyText muted>
          {messages.transactions.showingRecent(transactions.data.items.length)}
        </BodyText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  main: { flex: 1, gap: 2 },
  description: { fontSize: fontSize.body, fontWeight: '600' },
  meta: { fontSize: fontSize.caption },
  trailing: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  status: { fontSize: fontSize.caption },
});
