import { financialDateFromLocalClock } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCards } from '../../../../../api/cards';
import { currentLimitLabel } from '../../../../../features/cards/card-form';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { ListItem } from '../../../../../ui/ListItem';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { Title } from '../../../../../ui/Title';

export default function CardsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const cards = useCards(spaceId);

  if (cards.isPending) {
    return <LoadingScreen />;
  }

  const today = financialDateFromLocalClock(new Date());

  return (
    <Screen>
      <Title>{messages.cards.title}</Title>
      {cards.isError && <FormError message={messages.cards.loadError} />}
      {cards.isSuccess && cards.data.length === 0 && (
        <BodyText muted>{messages.cards.empty}</BodyText>
      )}
      {cards.isSuccess &&
        cards.data.map((card) => (
          <ListItem
            key={card.id}
            title={card.name}
            subtitle={[
              card.archived ? messages.cards.archivedTag : null,
              messages.cards.days(card.closingDay, card.dueDay),
              messages.cards.currentLimit(currentLimitLabel(card, today)),
            ]
              .filter((part): part is string => part !== null)
              .join(' — ')}
            accessibilityHint={messages.cards.openHint}
            onPress={() =>
              router.push({
                pathname: '/spaces/[spaceId]/cards/[cardId]',
                params: { spaceId, cardId: card.id },
              })
            }
          />
        ))}
      <Button
        label={messages.cards.newAction}
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/cards/new', params: { spaceId } })
        }
      />
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
