import { financialDateFromLocalClock, formatDisplayDate } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateCard } from '../../../../../api/cards';
import {
  describeCardError,
  parseCardDetails,
  parseLimit,
} from '../../../../../features/cards/card-form';
import { messages } from '../../../../../i18n/messages';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { Screen } from '../../../../../ui/Screen';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function NewCardScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const createCard = useCreateCard(spaceId);
  const [name, setName] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [limit, setLimit] = useState('');
  const [limitDate, setLimitDate] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    const details = parseCardDetails({ name, closingDay, dueDay });
    const parsedLimit = parseLimit(limit, limitDate);
    if (!details.ok) {
      setValidationError(details.error);
      return;
    }
    if (!parsedLimit.ok) {
      setValidationError(parsedLimit.error);
      return;
    }
    setValidationError(null);
    try {
      await createCard.mutateAsync({
        ...details.value,
        limitMinor: parsedLimit.value.amountMinor,
        limitEffectiveFrom: parsedLimit.value.effectiveFrom,
      });
      router.back();
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{messages.cards.newTitle}</Title>
      <TextField
        label={messages.cards.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={60}
      />
      <TextField
        label={messages.cards.closingDayLabel}
        hint={messages.cards.dayHint}
        value={closingDay}
        onChangeText={setClosingDay}
        inputMode="numeric"
        maxLength={2}
      />
      <TextField
        label={messages.cards.dueDayLabel}
        value={dueDay}
        onChangeText={setDueDay}
        inputMode="numeric"
        maxLength={2}
      />
      <TextField
        label={messages.cards.limitLabel}
        value={limit}
        onChangeText={setLimit}
        placeholder="0,00"
        inputMode="decimal"
      />
      <TextField
        label={messages.cards.limitDateLabel}
        hint={messages.transactions.dateHint}
        value={limitDate}
        onChangeText={setLimitDate}
        inputMode="numeric"
        maxLength={10}
      />
      <FormError message={validationError ?? describeCardError(createCard.error)} />
      <Button
        label={messages.cards.createAction}
        onPress={handleSubmit}
        loading={createCard.isPending}
      />
      <Button
        label={messages.transactions.cancelAction}
        variant="link"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
