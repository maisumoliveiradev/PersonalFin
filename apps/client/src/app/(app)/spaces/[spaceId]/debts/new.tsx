import { financialDateFromLocalClock, formatDisplayDate } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateDebt } from '../../../../../api/debts';
import { describeDebtError, parseDebtForm } from '../../../../../features/debts/debt-form';
import { messages } from '../../../../../i18n/messages';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { Screen } from '../../../../../ui/Screen';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function NewDebtScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const createDebt = useCreateDebt(spaceId);
  const [name, setName] = useState('');
  const [original, setOriginal] = useState('');
  const [count, setCount] = useState('');
  const [installment, setInstallment] = useState('');
  const [firstDue, setFirstDue] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    const parsed = parseDebtForm({ name, original, count, installment, firstDue });
    if (!parsed.ok) {
      setValidationError(parsed.error);
      return;
    }
    setValidationError(null);
    try {
      const created = await createDebt.mutateAsync(parsed.value);
      router.replace({
        pathname: '/spaces/[spaceId]/debts/[debtId]',
        params: { spaceId, debtId: created.id },
      });
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{messages.debts.newTitle}</Title>
      <TextField
        label={messages.debts.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <TextField
        label={messages.debts.originalLabel}
        value={original}
        onChangeText={setOriginal}
        placeholder="0,00"
        inputMode="decimal"
      />
      <TextField
        label={messages.debts.countLabel}
        value={count}
        onChangeText={setCount}
        inputMode="numeric"
        maxLength={3}
      />
      <TextField
        label={messages.debts.installmentLabel}
        hint={messages.debts.installmentHint}
        value={installment}
        onChangeText={setInstallment}
        placeholder="0,00"
        inputMode="decimal"
      />
      <TextField
        label={messages.debts.firstDueLabel}
        hint={messages.transactions.dateHint}
        value={firstDue}
        onChangeText={setFirstDue}
        inputMode="numeric"
        maxLength={10}
      />
      <FormError message={validationError ?? describeDebtError(createDebt.error)} />
      <Button
        label={messages.debts.createAction}
        onPress={handleSubmit}
        loading={createDebt.isPending}
      />
      <Button
        label={messages.transactions.cancelAction}
        variant="link"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
