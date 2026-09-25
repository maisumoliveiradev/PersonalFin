import { useLocalSearchParams, useRouter } from 'expo-router';

import { ComparisonCard } from '../../../../features/analytics/ComparisonCard';
import { EvolutionCard } from '../../../../features/analytics/EvolutionCard';
import { MonthNavigator } from '../../../../features/transactions/MonthNavigator';
import { monthFromParam } from '../../../../features/transactions/transaction-filters';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { Screen } from '../../../../ui/Screen';
import { Title } from '../../../../ui/Title';

export default function AnalyticsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ spaceId: string; month?: string }>();
  const { spaceId } = params;
  const month = monthFromParam(params.month);

  return (
    <Screen>
      <Title>{messages.analytics.title}</Title>
      <MonthNavigator month={month} onChange={(next) => router.setParams({ month: next })} />
      <ComparisonCard spaceId={spaceId} month={month} />
      <EvolutionCard spaceId={spaceId} throughMonth={month} />
      <BodyText muted>{messages.analytics.definitionsHint}</BodyText>
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
