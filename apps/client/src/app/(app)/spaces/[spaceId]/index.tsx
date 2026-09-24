import { useLocalSearchParams, useRouter } from 'expo-router';

import { useFinancialSpace } from '../../../../api/financial-spaces';
import { CategoryOverview } from '../../../../features/categories/CategoryOverview';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { Title } from '../../../../ui/Title';

export default function FinancialSpaceHomeScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
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
      {backToSpaces}
      <CategoryOverview spaceId={space.data.id} />
    </Screen>
  );
}
