import type { CardInvoice } from '@personalfin/api-contract';
import {
  financialDateFromLocalClock,
  formatDisplayDate,
  formatMoney,
  isValidMonth,
  type Month,
  monthOf,
  parseAmountInput,
  parseDisplayDate,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ApiRequestError } from '../../../../../api/api-client';
import {
  useCardInvoice,
  useCards,
  usePayInvoice,
  useRemoveInvoicePayment,
  useSetInvoiceDates,
} from '../../../../../api/cards';
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
      <BodyText>{messages.cards.invoiceTotal(money(invoice.totalMinor))}</BodyText>
      <BodyText>{messages.cards.invoiceStates[invoice.state]}</BodyText>
      <BodyText>
        {messages.cards.invoiceBalance(money(invoice.paidMinor), money(invoice.outstandingMinor))}
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
      <PaymentSection spaceId={spaceId} month={month} invoice={invoice} />
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

function money(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

function amountInput(outstandingMinor: number): string {
  return outstandingMinor > 0 ? money(outstandingMinor).replace(/^R\$\u00a0/, '') : '';
}

function PaymentSection({
  spaceId,
  month,
  invoice,
}: {
  spaceId: string;
  month: Month;
  invoice: CardInvoice;
}) {
  const pay = usePayInvoice(spaceId, invoice.cardId, month);
  const remove = useRemoveInvoicePayment(spaceId, invoice.cardId, month);
  const [amount, setAmount] = useState(() => amountInput(invoice.outstandingMinor));
  const [paidOn, setPaidOn] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  function submit(): void {
    const parsed = parseAmountInput(amount, 'BRL', 'pt-BR');
    const date = parseDisplayDate(paidOn, 'pt-BR');
    if (!parsed.ok) {
      setValidationError(messages.cards.errors.paymentInvalid);
      return;
    }
    if (date === null) {
      setValidationError(messages.cards.errors.dateInvalid);
      return;
    }
    setValidationError(null);
    pay.mutate(
      { amountMinor: parsed.amountMinor, paidOn: date },
      { onSuccess: (updated) => setAmount(amountInput(updated.outstandingMinor)) },
    );
  }

  const failure = pay.error ?? remove.error;
  let submitError: string | null = null;
  if (failure instanceof ApiRequestError && failure.code === 'PAYMENT_EXCEEDS_OUTSTANDING') {
    submitError = messages.cards.errors.paymentTooLarge;
  } else if (failure !== null) {
    submitError = messages.cards.errors.paymentFailed;
  }

  return (
    <>
      {pay.isSuccess && <StatusMessage>{messages.cards.paid}</StatusMessage>}
      {invoice.payments.length > 0 && <SectionTitle>{messages.cards.paymentsTitle}</SectionTitle>}
      {invoice.payments.map((payment) => {
        const amountLabel = money(payment.amountMinor);
        const dateLabel = formatDisplayDate(payment.paidOn, 'pt-BR');
        return (
          <Button
            key={payment.id}
            label={messages.cards.removePaymentAction(amountLabel, dateLabel)}
            variant="link"
            loading={remove.isPending && remove.variables === payment.id}
            onPress={() => remove.mutate(payment.id)}
          />
        );
      })}
      {invoice.outstandingMinor > 0 && (
        <>
          <SectionTitle>{messages.cards.payTitle}</SectionTitle>
          <BodyText muted>{messages.cards.payHint}</BodyText>
          <TextField
            label={messages.cards.paymentAmountLabel}
            value={amount}
            onChangeText={setAmount}
            inputMode="decimal"
          />
          <TextField
            label={messages.cards.paymentDateLabel}
            hint={messages.transactions.dateHint}
            value={paidOn}
            onChangeText={setPaidOn}
            inputMode="numeric"
            maxLength={10}
          />
          <FormError message={validationError ?? submitError} />
          <Button label={messages.cards.payAction} onPress={submit} loading={pay.isPending} />
        </>
      )}
    </>
  );
}
