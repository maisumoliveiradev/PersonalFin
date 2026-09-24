import {
  type AmountParseError,
  financialDateFromLocalClock,
  formatDisplayDate,
  parseAmountInput,
  parseDisplayDate,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useRecordBalanceSnapshot } from '../../../../../api/balance';
import { messages } from '../../../../../i18n/messages';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { Screen } from '../../../../../ui/Screen';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

const AMOUNT_ERRORS: Record<AmountParseError, string> = {
  empty: messages.balance.errors.amountEmpty,
  invalid: messages.balance.errors.amountInvalid,
  too_many_decimals: messages.balance.errors.amountTooManyDecimals,
  not_positive: messages.balance.errors.amountInvalid,
  too_large: messages.balance.errors.amountTooLarge,
};

export default function NewBalanceSnapshotScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const recordSnapshot = useRecordBalanceSnapshot(spaceId);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    const parsed = parseAmountInput(amount, 'BRL', 'pt-BR', {
      allowNegative: true,
      allowZero: true,
    });
    if (!parsed.ok) {
      setValidationError(AMOUNT_ERRORS[parsed.error]);
      return;
    }
    const observedOn = parseDisplayDate(date, 'pt-BR');
    if (observedOn === null) {
      setValidationError(messages.balance.errors.dateInvalid);
      return;
    }
    setValidationError(null);
    try {
      await recordSnapshot.mutateAsync({
        amountMinor: parsed.amountMinor,
        observedOn,
        note: note.trim() === '' ? null : note.trim(),
      });
      router.back();
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{messages.balance.newTitle}</Title>
      <TextField
        label={messages.balance.amountLabel}
        hint={messages.balance.amountHint}
        value={amount}
        onChangeText={setAmount}
        placeholder="0,00"
        inputMode="decimal"
      />
      <TextField
        label={messages.balance.dateLabel}
        hint={messages.transactions.dateHint}
        value={date}
        onChangeText={setDate}
        inputMode="numeric"
        maxLength={10}
      />
      <TextField
        label={messages.balance.noteLabel}
        value={note}
        onChangeText={setNote}
        maxLength={140}
      />
      <FormError
        message={
          validationError ?? (recordSnapshot.isError ? messages.balance.errors.unexpected : null)
        }
      />
      <Button
        label={messages.balance.saveAction}
        onPress={handleSubmit}
        loading={recordSnapshot.isPending}
      />
      <Button
        label={messages.transactions.cancelAction}
        variant="link"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
