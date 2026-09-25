import type { DebtDetail, DebtSummary, PrepaymentMode } from '@personalfin/api-contract';
import { financialDateFromLocalClock, formatDisplayDate } from '@personalfin/domain';
import { useState } from 'react';

import { useConfirmPrepayment, useSimulatePrepayment } from '../../api/debts';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { TextField } from '../../ui/TextField';
import { describeDebtError, money, parseAmount, parseDate } from './debt-form';

const MODE_OPTIONS: readonly Option<PrepaymentMode>[] = [
  { value: 'reduce_term', label: messages.debts.modes.reduce_term },
  { value: 'reduce_installment', label: messages.debts.modes.reduce_installment },
];

function scenario(label: string, summary: DebtSummary, installmentMinor: number): string {
  return messages.debts.scenario(
    label,
    summary.remainingInstallments,
    money(installmentMinor),
    money(summary.outstandingMinor),
  );
}

interface PrepaymentSimulatorProps {
  spaceId: string;
  debt: DebtDetail;
  canConfirm: boolean;
}

export function PrepaymentSimulator({ spaceId, debt, canConfirm }: PrepaymentSimulatorProps) {
  const simulate = useSimulatePrepayment(spaceId, debt.id);
  const confirm = useConfirmPrepayment(spaceId, debt.id);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<PrepaymentMode>('reduce_term');
  const [date, setDate] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const result = simulate.data;

  function handleSimulate(): void {
    const parsed = parseAmount(amount);
    if (!parsed.ok) {
      setValidationError(parsed.error);
      return;
    }
    setValidationError(null);
    setConfirming(false);
    setConfirmed(false);
    simulate.mutate({ amountMinor: parsed.value, mode });
  }

  async function handleConfirm(): Promise<void> {
    if (result === undefined) {
      return;
    }
    const parsedDate = parseDate(date);
    if (!parsedDate.ok) {
      setValidationError(parsedDate.error);
      return;
    }
    setValidationError(null);
    try {
      await confirm.mutateAsync({
        version: debt.version,
        amountMinor: result.amountMinor,
        mode: result.mode,
        paidOn: parsedDate.value,
      });
      simulate.reset();
      setAmount('');
      setConfirming(false);
      setConfirmed(true);
    } catch {
      return;
    }
  }

  return (
    <>
      <SectionTitle>{messages.debts.simulationTitle}</SectionTitle>
      <BodyText muted>{messages.debts.simulationHint}</BodyText>
      {confirmed && <StatusMessage>{messages.debts.prepaid}</StatusMessage>}
      <TextField
        label={messages.debts.simulationAmountLabel}
        value={amount}
        onChangeText={setAmount}
        placeholder="0,00"
        inputMode="decimal"
      />
      <OptionGroup
        label={messages.debts.modeLabel}
        options={MODE_OPTIONS}
        selected={mode}
        onSelect={setMode}
      />
      <FormError message={validationError ?? describeDebtError(simulate.error ?? confirm.error)} />
      <Button
        label={messages.debts.simulateAction}
        variant="link"
        loading={simulate.isPending}
        onPress={handleSimulate}
      />
      {result !== undefined && (
        <>
          <BodyText>
            {scenario(messages.debts.scenarioNow, result.before, debt.installmentAmountMinor)}
          </BodyText>
          <BodyText>
            {scenario(
              messages.debts.scenarioAfter,
              result.after,
              result.plan.installmentAmountMinor,
            )}
          </BodyText>
          {result.after.lastInstallmentMinor !== null &&
            result.after.lastInstallmentMinor !== result.plan.installmentAmountMinor && (
              <BodyText muted>
                {messages.debts.scenarioLast(money(result.after.lastInstallmentMinor))}
              </BodyText>
            )}
          {canConfirm && !confirming && (
            <Button
              label={messages.debts.confirmPrepaymentAction}
              onPress={() => setConfirming(true)}
            />
          )}
          {canConfirm && confirming && (
            <>
              <BodyText>{messages.debts.prepaymentConfirmation}</BodyText>
              <TextField
                label={messages.debts.prepaymentDateLabel}
                hint={messages.transactions.dateHint}
                value={date}
                onChangeText={setDate}
                inputMode="numeric"
                maxLength={10}
              />
              <Button
                label={messages.debts.confirmPrepaymentFinal}
                loading={confirm.isPending}
                onPress={handleConfirm}
              />
              <Button
                label={messages.transactions.cancelAction}
                variant="link"
                onPress={() => setConfirming(false)}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
