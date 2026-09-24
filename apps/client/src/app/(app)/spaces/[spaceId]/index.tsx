import { useLocalSearchParams, useRouter } from 'expo-router';

import { useFinancialSpace } from '../../../../api/financial-spaces';
import { CategoryOverview } from '../../../../features/categories/CategoryOverview';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { Title } from '../../../../ui/Title';

export default function FinancialSpaceHomeScreen() {
  const router = useRouter();
  const { spaceId, saved } = useLocalSearchParams<{ spaceId: string; saved?: string }>();
  const space = useFinancialSpace(spaceId);
  const backToSpaces = (
    <Button
      label={messages.spaces.backToSpaces}
      variant="link"
      onPress={() => router.replace('/')}
    />
  );

  if (space.isPending) {
    return <LoadingScreen />;
  }

  if (space.isError) {
    return (
      <Screen>
        <FormError message={messages.spaces.notFound} />
        {backToSpaces}
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{space.data.name}</Title>
      <BodyText muted>{messages.spaces.ownerRole}</BodyText>
      {saved === '1' && <StatusMessage>{messages.transactions.saved}</StatusMessage>}
      <Button
        label={messages.transactions.newAction}
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/transactions/new', params: { spaceId } })
        }
      />
      {backToSpaces}
      <CategoryOverview spaceId={space.data.id} />
    </Screen>
  );
}
