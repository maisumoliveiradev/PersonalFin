import type { CardInvoice } from '@personalfin/api-contract';
import {
  financialDateFromLocalClock,
  formatDisplayDate,
  formatMoney,
  isValidMonth,
  type Month,
  monthOf,
  parseDisplayDate,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCardInvoice, useCards, useSetInvoiceDates } from '../../../../../api/cards';
import { describeCardError } from '../../../../../features/cards/card-form';
import { MonthNavigator } from '../../../../../features/transactions/MonthNavigator';
import { TransactionRow } from '../../../../../features/transactions/TransactionList';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { SectionTitle } from '../../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../../ui/StatusMessage';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function CardInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ spaceId: string; cardId: string; month?: string }>();
  const { spaceId, cardId } = params;
  const month: Month =
    params.month !== undefined && isValidMonth(params.month)
      ? params.month
      : monthOf(financialDateFromLocalClock(new Date()));
  const cards = useCards(spaceId);
  const invoice = useCardInvoice(spaceId, cardId, month);

  if (cards.isPending) {
    return <LoadingScreen />;
  }
  const card = cards.data?.find((item) => item.id === cardId);

  return (
    <Screen>
      <Title>{messages.cards.invoiceTitle(card?.name ?? '')}</Title>
      <MonthNavigator month={month} onChange={(next) => router.setParams({ month: next })} />
      {invoice.isError && <FormError message={messages.cards.loadError} />}
      {invoice.isSuccess && (
        <InvoiceDetails
          key={`${month}-${invoice.data.version ?? 0}`}
          spaceId={spaceId}
          month={month}
          invoice={invoice.data}
        />
      )}
      <Button
        label={messages.cards.backToCards}
        variant="link"
        onPress={() =>
          router.dismissTo({ pathname: '/spaces/[spaceId]/cards', params: { spaceId } })
        }
      />
    </Screen>
  );
}

function InvoiceDetails({
  spaceId,
  month,
  invoice,
}: {
  spaceId: string;
  month: Month;
  invoice: CardInvoice;
}) {
  const setDates = useSetInvoiceDates(spaceId, invoice.cardId, month);
  const [closingDate, setClosingDate] = useState(formatDisplayDate(invoice.closingDate, 'pt-BR'));
  const [dueDate, setDueDate] = useState(formatDisplayDate(invoice.dueDate, 'pt-BR'));
  const [validationError, setValidationError] = useState<string | null>(null);

  function saveDates(): void {
    const closing = parseDisplayDate(closingDate, 'pt-BR');
    const due = parseDisplayDate(dueDate, 'pt-BR');
    if (closing === null || due === null || closing > due) {
      setValidationError(messages.cards.errors.datesInvalid);
      return;
    }
    setValidationError(null);
    setDates.mutate({ version: invoice.version, closingDate: closing, dueDate: due });
  }

  return (
    <>
      <BodyText>
        {messages.cards.invoiceDates(
          formatDisplayDate(invoice.closingDate, 'pt-BR'),
          formatDisplayDate(invoice.dueDate, 'pt-BR'),
        )}
      </BodyText>
      <BodyText>
        {messages.cards.invoiceTotal(
          formatMoney({ amountMinor: invoice.totalMinor, currency: 'BRL' }, 'pt-BR'),
        )}
      </BodyText>
      {invoice.purchases.length === 0 && <BodyText muted>{messages.cards.invoiceEmpty}</BodyText>}
      {invoice.purchases.map((purchase) => (
        <TransactionRow
          key={purchase.id}
          spaceId={spaceId}
          transaction={purchase}
          changingStatus={false}
          onToggleStatus={() => undefined}
        />
      ))}
      <SectionTitle>{messages.cards.invoiceDatesTitle}</SectionTitle>
      <BodyText muted>{messages.cards.invoiceDatesHint}</BodyText>
      {setDates.isSuccess && <StatusMessage>{messages.cards.datesSaved}</StatusMessage>}
      <TextField
        label={messages.cards.closingDateLabel}
        hint={messages.transactions.dateHint}
        value={closingDate}
        onChangeText={setClosingDate}
        inputMode="numeric"
        maxLength={10}
      />
      <TextField
        label={messages.cards.dueDateLabel}
        value={dueDate}
        onChangeText={setDueDate}
        inputMode="numeric"
        maxLength={10}
      />
      <FormError message={validationError ?? describeCardError(setDates.error)} />
      <Button
        label={messages.cards.saveDatesAction}
        onPress={saveDates}
        loading={setDates.isPending}
      />
    </>
  );
}
