import { financialDateFromLocalClock, formatDisplayDate } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  useDebt,
  useRecordDebtPayment,
  useRemoveDebtPayment,
  useUpdateDebt,
} from '../../../../../api/debts';
import { useFinancialSpace } from '../../../../../api/financial-spaces';
import {
  amountInput,
  describeDebtError,
  money,
  parseAmount,
  parseDate,
  percent,
} from '../../../../../features/debts/debt-form';
import { PrepaymentSimulator } from '../../../../../features/debts/PrepaymentSimulator';
import { can } from '../../../../../features/financial-spaces/permissions';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { ProgressBar } from '../../../../../ui/ProgressBar';
import { Screen } from '../../../../../ui/Screen';
import { SectionTitle } from '../../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../../ui/StatusMessage';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function DebtScreen() {
  const router = useRouter();
  const { spaceId, debtId } = useLocalSearchParams<{ spaceId: string; debtId: string }>();
  const debt = useDebt(spaceId, debtId);
  const space = useFinancialSpace(spaceId);
  const recordPayment = useRecordDebtPayment(spaceId, debtId);
  const removePayment = useRemoveDebtPayment(spaceId, debtId);
  const updateDebt = useUpdateDebt(spaceId, debtId);
  const [amount, setAmount] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const backToDebts = (
    <Button
      label={messages.debts.backToDebts}
      variant="link"
      onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]/debts', params: { spaceId } })}
    />
  );

  if (debt.isPending) {
    return <LoadingScreen />;
  }
  if (debt.isError) {
    return (
      <Screen>
        <FormError message={messages.debts.notFound} />
        {backToDebts}
      </Screen>
    );
  }

  const current = debt.data;
  const { summary } = current;
  const canRecord = space.data !== undefined && can(space.data, 'record');
  const canPlan = space.data !== undefined && can(space.data, 'plan');
  const amountValue =
    amount ?? amountInput(Math.min(current.installmentAmountMinor, summary.outstandingMinor));

  async function handlePay(): Promise<void> {
    const parsedAmount = parseAmount(amountValue);
    if (!parsedAmount.ok) {
      setValidationError(parsedAmount.error);
      return;
    }
    const parsedDate = parseDate(paidOn);
    if (!parsedDate.ok) {
      setValidationError(parsedDate.error);
      return;
    }
    setValidationError(null);
    setPaid(false);
    try {
      await recordPayment.mutateAsync({
        kind: 'installment',
        amountMinor: parsedAmount.value,
        paidOn: parsedDate.value,
      });
      setAmount(null);
      setPaid(true);
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{current.name}</Title>
      {current.archived && <BodyText muted>{messages.debts.archivedTag}</BodyText>}
      <ProgressBar
        label={messages.debts.progressLabel(current.name, percent(summary.progressTenths))}
        tenths={summary.progressTenths}
      />
      <BodyText>{messages.debts.progress(percent(summary.progressTenths))}</BodyText>
      <BodyText>{messages.debts.outstanding(money(summary.outstandingMinor))}</BodyText>
      <BodyText muted>{messages.debts.original(money(current.originalAmountMinor))}</BodyText>
      <BodyText muted>
        {messages.debts.installments(summary.paidInstallments, summary.remainingInstallments)}
      </BodyText>
      <BodyText muted>
        {messages.debts.installmentAmount(money(current.installmentAmountMinor))}
      </BodyText>
      {summary.lastInstallmentMinor !== null &&
        summary.lastInstallmentMinor !== current.installmentAmountMinor && (
          <BodyText muted>
            {messages.debts.lastInstallment(money(summary.lastInstallmentMinor))}
          </BodyText>
        )}
      {summary.nextDueDate !== null && (
        <BodyText muted>
          {messages.debts.nextDue(formatDisplayDate(summary.nextDueDate, 'pt-BR'))}
        </BodyText>
      )}
      {summary.settled && <StatusMessage>{messages.debts.settledTag}</StatusMessage>}

      {canRecord && !summary.settled && (
        <>
          <SectionTitle>{messages.debts.payTitle}</SectionTitle>
          {paid && <StatusMessage>{messages.debts.paid}</StatusMessage>}
          <TextField
            label={messages.debts.paymentAmountLabel}
            value={amountValue}
            onChangeText={setAmount}
            inputMode="decimal"
          />
          <TextField
            label={messages.debts.paymentDateLabel}
            hint={messages.transactions.dateHint}
            value={paidOn}
            onChangeText={setPaidOn}
            inputMode="numeric"
            maxLength={10}
          />
          <FormError message={validationError ?? describeDebtError(recordPayment.error)} />
          <Button
            label={messages.debts.payAction}
            onPress={handlePay}
            loading={recordPayment.isPending}
          />
        </>
      )}

      {!summary.settled && (
        <PrepaymentSimulator spaceId={spaceId} debt={current} canConfirm={canRecord} />
      )}

      <SectionTitle>{messages.debts.paymentsTitle}</SectionTitle>
      {current.payments.length === 0 && <BodyText muted>{messages.debts.noPayments}</BodyText>}
      {current.payments.map((payment) => {
        const description = messages.debts.paymentItem(
          messages.debts.kinds[payment.kind],
          money(payment.amountMinor),
          formatDisplayDate(payment.paidOn, 'pt-BR'),
        );
        return <BodyText key={payment.id}>{description}</BodyText>;
      })}
      {canRecord &&
        current.payments.map((payment) => (
          <Button
            key={`remove-${payment.id}`}
            label={messages.debts.removeLabel}
            accessibilityLabel={messages.debts.removePayment(
              messages.debts.paymentItem(
                messages.debts.kinds[payment.kind],
                money(payment.amountMinor),
                formatDisplayDate(payment.paidOn, 'pt-BR'),
              ),
            )}
            variant="link"
            loading={removePayment.isPending && removePayment.variables === payment.id}
            onPress={() => removePayment.mutate(payment.id)}
          />
        ))}
      <FormError message={describeDebtError(removePayment.error ?? updateDebt.error)} />
      {canPlan && (
        <Button
          label={current.archived ? messages.debts.unarchiveAction : messages.debts.archiveAction}
          variant="link"
          loading={updateDebt.isPending}
          onPress={() =>
            updateDebt.mutate({ version: current.version, archived: !current.archived })
          }
        />
      )}
      {backToDebts}
    </Screen>
  );
}
