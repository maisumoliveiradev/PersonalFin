import { queryClient } from '../../api/query-client';
import { useCurrentUser } from '../../api/use-current-user';
import { authClient } from '../../auth/auth-client';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { Screen } from '../../ui/Screen';
import { Title } from '../../ui/Title';

export default function HomeScreen() {
  const currentUser = useCurrentUser();

  async function handleSignOut(): Promise<void> {
    await authClient.signOut();
    queryClient.clear();
  }

  if (currentUser.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      {currentUser.isError ? (
        <>
          <FormError message={messages.home.loadError} />
          <Button label={messages.common.retry} onPress={() => currentUser.refetch()} />
        </>
      ) : (
        <Title>{messages.home.greeting(currentUser.data.name)}</Title>
      )}
      <Button label={messages.auth.signOutAction} variant="link" onPress={handleSignOut} />
    </Screen>
  );
}
