import type { Commitments } from '@personalfin/api-contract';
import {
  financialDateFromLocalClock,
  formatDisplayDate,
  formatMoney,
  formatMonthLabel,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCommitments } from '../../../../api/commitments';
import { useChangeTransactionStatus } from '../../../../api/transactions';
import { TransactionRow } from '../../../../features/transactions/TransactionList';
import { statusToggle } from '../../../../features/transactions/transaction-presentation';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { ListItem } from '../../../../ui/ListItem';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { type Option, OptionGroup } from '../../../../ui/OptionGroup';
import { Screen } from '../../../../ui/Screen';
import { SectionTitle } from '../../../../ui/SectionTitle';
import { Title } from '../../../../ui/Title';
import { fontSize, spacing, usePalette } from '../../../../ui/theme';

const PERIODS = ['7', '30', '90'] as const;
type Period = (typeof PERIODS)[number];
const PERIOD_OPTIONS: readonly Option<Period>[] = PERIODS.map((value) => ({
  value,
  label: messages.commitments.days(Number(value)),
}));

type Section = Commitments['overdue'];

function Totals({ section }: { section: Section }) {
  const palette = usePalette();
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
  return (
    <View style={styles.totals}>
      <Text
        style={[styles.total, { color: palette.success }]}
        aria-label={`${messages.commitments.expectedIncome}: ${money(section.income)}`}
      >
        {`${messages.commitments.expectedIncome}: ${money(section.income)}`}
      </Text>
      <Text
        style={[styles.total, { color: palette.text }]}
        aria-label={`${messages.commitments.expectedExpenses}: ${money(section.expenses)}`}
      >
        {`${messages.commitments.expectedExpenses}: ${money(section.expenses)}`}
      </Text>
    </View>
  );
}

export default function CommitmentsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const [period, setPeriod] = useState<Period>('30');
  const [today] = useState(() => financialDateFromLocalClock(new Date()));
  const commitments = useCommitments(spaceId, today, Number(period));
  const changeStatus = useChangeTransactionStatus(spaceId);

  if (commitments.isPending) {
    return <LoadingScreen />;
  }

  function renderSection(section: Section, emptyMessage: string) {
    if (section.items.length === 0 && section.invoices.length === 0) {
      return <BodyText muted>{emptyMessage}</BodyText>;
    }
    return (
      <>
        <Totals section={section} />
        {section.invoices.map((invoice) => (
          <ListItem
            key={`${invoice.cardId}-${invoice.referenceMonth}`}
            title={messages.commitments.invoiceItem(
              invoice.cardName,
              formatMonthLabel(invoice.referenceMonth, 'pt-BR'),
              formatDisplayDate(invoice.dueDate, 'pt-BR'),
              formatMoney({ amountMinor: invoice.amountMinor, currency: 'BRL' }, 'pt-BR'),
            )}
            accessibilityHint={messages.cards.openHint}
            onPress={() =>
              router.push({
                pathname: '/spaces/[spaceId]/cards/invoice',
                params: { spaceId, cardId: invoice.cardId, month: invoice.referenceMonth },
              })
            }
          />
        ))}
        {section.items.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            spaceId={spaceId}
            transaction={transaction}
            changingStatus={
              changeStatus.isPending && changeStatus.variables?.transactionId === transaction.id
            }
            onToggleStatus={() =>
              changeStatus.mutate({
                transactionId: transaction.id,
                version: transaction.version,
                status: statusToggle(transaction).nextStatus,
              })
            }
          />
        ))}
        {section.hasMore && <BodyText muted>{messages.commitments.more}</BodyText>}
      </>
    );
  }

  return (
    <Screen>
      <Title>{messages.commitments.title}</Title>
      <OptionGroup
        label={messages.commitments.periodLabel}
        options={PERIOD_OPTIONS}
        selected={period}
        onSelect={setPeriod}
      />
      {commitments.isError && <FormError message={messages.commitments.loadError} />}
      {commitments.isSuccess && (
        <>
          <SectionTitle>{messages.commitments.overdueTitle}</SectionTitle>
          {renderSection(commitments.data.overdue, messages.commitments.noneOverdue)}
          <SectionTitle>
            {messages.commitments.upcomingTitle(
              formatDisplayDate(commitments.data.from, 'pt-BR'),
              formatDisplayDate(commitments.data.through, 'pt-BR'),
            )}
          </SectionTitle>
          {renderSection(commitments.data.upcoming, messages.commitments.noneUpcoming)}
        </>
      )}
      <Button label={messages.spaces.backToSpace} variant="link" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  totals: { gap: spacing.xs },
  total: { fontSize: fontSize.body, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
