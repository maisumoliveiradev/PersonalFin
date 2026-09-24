import type { Card } from '@personalfin/api-contract';
import { financialDateFromLocalClock, formatDisplayDate } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCards, useRecordCardLimit, useUpdateCard } from '../../../../../api/cards';
import {
  currentLimitLabel,
  describeCardError,
  limitAmountLabel,
  parseCardDetails,
  parseLimit,
} from '../../../../../features/cards/card-form';
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

export default function CardDetailScreen() {
  const router = useRouter();
  const { spaceId, cardId } = useLocalSearchParams<{ spaceId: string; cardId: string }>();
  const cards = useCards(spaceId);

  if (cards.isPending) {
    return <LoadingScreen />;
  }
  const card = cards.isSuccess ? (cards.data.find((item) => item.id === cardId) ?? null) : null;
  if (card === null) {
    return (
      <Screen>
        <FormError message={messages.cards.notFound} />
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
  return <CardEditor key={card.id} spaceId={spaceId} card={card} />;
}

function CardEditor({ spaceId, card }: { spaceId: string; card: Card }) {
  const router = useRouter();
  const today = financialDateFromLocalClock(new Date());
  const updateCard = useUpdateCard(spaceId, card.id);
  const recordLimit = useRecordCardLimit(spaceId, card.id);
  const [name, setName] = useState(card.name);
  const [closingDay, setClosingDay] = useState(String(card.closingDay));
  const [dueDay, setDueDay] = useState(String(card.dueDay));
  const [limit, setLimit] = useState('');
  const [limitDate, setLimitDate] = useState(() => formatDisplayDate(today, 'pt-BR'));
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  function saveDetails(): void {
    const details = parseCardDetails({ name, closingDay, dueDay });
    setDetailsError(details.ok ? null : details.error);
    if (details.ok) {
      updateCard.mutate({ version: card.version, ...details.value });
    }
  }

  async function saveLimit(): Promise<void> {
    const parsed = parseLimit(limit, limitDate);
    setLimitError(parsed.ok ? null : parsed.error);
    if (!parsed.ok) {
      return;
    }
    try {
      await recordLimit.mutateAsync(parsed.value);
      setLimit('');
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{card.name}</Title>
      {card.archived && <BodyText muted>{messages.cards.archivedTag}</BodyText>}
      <BodyText>{messages.cards.currentLimit(currentLimitLabel(card, today))}</BodyText>
      {updateCard.isSuccess && <StatusMessage>{messages.cards.saved}</StatusMessage>}
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
      <FormError message={detailsError ?? describeCardError(updateCard.error)} />
      <Button
        label={messages.cards.saveAction}
        onPress={saveDetails}
        loading={updateCard.isPending && updateCard.variables?.archived === undefined}
      />
      <Button
        label={card.archived ? messages.cards.unarchiveAction : messages.cards.archiveAction}
        variant="link"
        onPress={() => updateCard.mutate({ version: card.version, archived: !card.archived })}
      />
      <SectionTitle>{messages.cards.limitTitle}</SectionTitle>
      {recordLimit.isSuccess && <StatusMessage>{messages.cards.limitSaved}</StatusMessage>}
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
      <FormError message={limitError ?? describeCardError(recordLimit.error)} />
      <Button
        label={messages.cards.newLimitAction}
        onPress={saveLimit}
        loading={recordLimit.isPending}
      />
      <SectionTitle>{messages.cards.limitHistoryTitle}</SectionTitle>
      <BodyText muted>{messages.cards.limitHistoryHint}</BodyText>
      {card.limits.map((change) => (
        <BodyText key={change.id}>
          {messages.cards.limitFrom(
            limitAmountLabel(change),
            formatDisplayDate(change.effectiveFrom, 'pt-BR'),
          )}
        </BodyText>
      ))}
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
