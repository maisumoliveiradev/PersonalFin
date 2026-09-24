import type { FinancialSpace } from '@personalfin/api-contract';
import { useRouter } from 'expo-router';

import { useFinancialSpaces } from '../../api/financial-spaces';
import { queryClient } from '../../api/query-client';
import { useCurrentUser } from '../../api/use-current-user';
import { authClient } from '../../auth/auth-client';
import { CreateFinancialSpaceForm } from '../../features/financial-spaces/CreateFinancialSpaceForm';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { ListItem } from '../../ui/ListItem';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { Screen } from '../../ui/Screen';
import { Title } from '../../ui/Title';

export default function FinancialSpacesScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const spaces = useFinancialSpaces();

  function openSpace(space: FinancialSpace): void {
    router.push({ pathname: '/spaces/[spaceId]', params: { spaceId: space.id } });
  }

  async function handleSignOut(): Promise<void> {
    await authClient.signOut();
    queryClient.clear();
  }

  if (spaces.isPending || currentUser.isPending) {
    return <LoadingScreen />;
  }

  const signOutButton = (
    <Button label={messages.auth.signOutAction} variant="link" onPress={handleSignOut} />
  );

  if (spaces.isError || currentUser.isError) {
    return (
      <Screen>
        <FormError message={messages.spaces.loadError} />
        <Button
          label={messages.common.retry}
          onPress={() => {
            void spaces.refetch();
            void currentUser.refetch();
          }}
        />
        {signOutButton}
      </Screen>
    );
  }

  if (spaces.data.length === 0) {
    return (
      <Screen>
        <BodyText muted>{messages.home.greeting(currentUser.data.name)}</BodyText>
        <Title>{messages.spaces.firstSpaceTitle}</Title>
        <BodyText>{messages.spaces.firstSpaceDescription}</BodyText>
        <CreateFinancialSpaceForm initialName={messages.spaces.defaultName} onCreated={openSpace} />
        {signOutButton}
      </Screen>
    );
  }

  return (
    <Screen>
      <BodyText muted>{messages.home.greeting(currentUser.data.name)}</BodyText>
      <Title>{messages.spaces.listTitle}</Title>
      {spaces.data.map((space) => (
        <ListItem
          key={space.id}
          title={space.name}
          subtitle={messages.spaces.ownerRole}
          accessibilityHint={messages.spaces.openSpaceHint}
          onPress={() => openSpace(space)}
        />
      ))}
      <Button label={messages.spaces.newSpaceAction} onPress={() => router.push('/spaces/new')} />
      {signOutButton}
    </Screen>
  );
}
