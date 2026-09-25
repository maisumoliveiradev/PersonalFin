import type { Transaction } from '@personalfin/api-contract';
import { formatMoney, formatRate } from '@personalfin/domain';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useChangeTransactionStatus, useTransactions } from '../../api/transactions';
import { messages } from '../../i18n/messages';
import { useSyncSnapshot } from '../../sync/sync-engine';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';
import { hasOptionalFilters, type TransactionFilters } from './transaction-filters';
import {
  statusToggle,
  transactionAmountLabel,
  transactionCategoryLabel,
  transactionDateLabel,
  transactionStatusLabel,
  transactionTypeLabel,
} from './transaction-presentation';

interface TransactionRowProps {
  spaceId: string;
  transaction: Transaction;
  canChangeStatus?: boolean;
  changingStatus: boolean;
  onToggleStatus: () => void;
}

export function TransactionRow({
  spaceId,
  transaction,
  canChangeStatus = true,
  changingStatus,
  onToggleStatus,
}: TransactionRowProps) {
  const palette = usePalette();
  const router = useRouter();
  const sync = useSyncSnapshot();
  const queued = sync.entries.some((entry) => entry.transactionId === transaction.id);
  const amount = transactionAmountLabel(transaction);
  const category = transactionCategoryLabel(transaction);
  const date = transactionDateLabel(transaction);
  const status = transactionStatusLabel(transaction);
  const toggle = statusToggle(transaction);
  const isPending = transaction.status === 'pending';
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <Pressable
        role="button"
        aria-label={messages.transactions.rowAccessibilityLabel({
          type: transactionTypeLabel(transaction),
          description: transaction.description,
          amount,
          date,
          category:
            transaction.recurrenceSeriesId === null
              ? category
              : `${category}, ${messages.recurrences.tag.toLowerCase()}`,
          status: queued ? `${status}, ${messages.sync.rowQueued}` : status,
        })}
        accessibilityHint={messages.transactions.editHint}
        onPress={() =>
          router.push({
            pathname: '/spaces/[spaceId]/transactions/[transactionId]/edit',
            params: { spaceId, transactionId: transaction.id },
          })
        }
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.main}>
          <Text style={[styles.description, { color: palette.text }]}>
            {transaction.description}
          </Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {[
              date,
              category,
              transaction.recurrenceSeriesId === null ? null : `↻ ${messages.recurrences.tag}`,
              transaction.installment === null
                ? null
                : messages.cards.installmentTag(
                    transaction.installment.number,
                    transaction.installment.count,
                  ),
              transaction.tags.length === 0
                ? null
                : transaction.tags.map((tag) => `#${tag.name}`).join(' '),
              transaction.attachmentCount === 0
                ? null
                : `📎 ${messages.attachments.rowCount(transaction.attachmentCount)}`,
              transaction.original === null
                ? null
                : messages.currencies.original(
                    formatMoney(
                      {
                        amountMinor: transaction.original.amountMinor,
                        currency: transaction.original.currency,
                      },
                      'pt-BR',
                    ),
                    formatRate(transaction.original.rate, ','),
                  ),
            ]
              .filter((part): part is string => part !== null)
              .join(' · ')}
          </Text>
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
          {queued && (
            <Text style={[styles.status, { color: palette.warning }]}>
              {messages.sync.rowQueued}
            </Text>
          )}
        </View>
      </Pressable>
      {canChangeStatus && !queued && transaction.cardPurchase === null && (
        <Button
          label={toggle.label}
          accessibilityLabel={messages.transactions.statusActionLabel(
            toggle.label,
            transaction.description,
          )}
          variant="link"
          loading={changingStatus}
          onPress={onToggleStatus}
        />
      )}
    </View>
  );
}

interface TransactionListProps {
  spaceId: string;
  filters: TransactionFilters;
  canRecord: boolean;
}

export function TransactionList({ spaceId, filters, canRecord }: TransactionListProps) {
  const palette = usePalette();
  const transactions = useTransactions(spaceId, filters);
  const changeStatus = useChangeTransactionStatus(spaceId);
  const items = transactions.data?.pages.flatMap((page) => page.items) ?? [];
  const emptyMessage = hasOptionalFilters(filters)
    ? messages.transactions.emptyFiltered
    : messages.transactions.emptyMonth;

  return (
    <View style={styles.container}>
      {transactions.isPending && (
        <ActivityIndicator aria-label={messages.common.loading} color={palette.primary} />
      )}
      {transactions.isError && (
        <>
          <FormError message={messages.transactions.loadError} />
          <Button label={messages.common.retry} onPress={() => transactions.refetch()} />
        </>
      )}
      <FormError
        message={changeStatus.isError ? messages.transactions.errors.statusFailed : null}
      />
      {transactions.isSuccess && items.length === 0 && <BodyText muted>{emptyMessage}</BodyText>}
      {transactions.isSuccess &&
        items.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            spaceId={spaceId}
            transaction={transaction}
            canChangeStatus={canRecord}
            changingStatus={
              changeStatus.isPending && changeStatus.variables?.transaction.id === transaction.id
            }
            onToggleStatus={() =>
              changeStatus.mutate({
                transaction,
                status: statusToggle(transaction).nextStatus,
              })
            }
          />
        ))}
      {transactions.hasNextPage && (
        <Button
          label={messages.transactions.loadMoreAction}
          variant="link"
          loading={transactions.isFetchingNextPage}
          onPress={() => transactions.fetchNextPage()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4, gap: spacing.xs },
  summary: { flexDirection: 'row', gap: spacing.sm },
  pressed: { opacity: 0.7 },
  main: { flex: 1, gap: 2 },
  description: { fontSize: fontSize.body, fontWeight: '600' },
  meta: { fontSize: fontSize.caption },
  trailing: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: fontSize.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  status: { fontSize: fontSize.caption },
});
