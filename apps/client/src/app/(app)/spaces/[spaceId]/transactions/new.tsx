import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCategories } from '../../../../../api/categories';
import { NewTransactionForm } from '../../../../../features/transactions/NewTransactionForm';
import { messages } from '../../../../../i18n/messages';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { Title } from '../../../../../ui/Title';

export default function NewTransactionScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const categories = useCategories(spaceId);

  function backToSpace(saved: boolean): void {
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params: saved ? { spaceId, saved: '1' } : { spaceId },
    });
  }

  if (categories.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.transactions.newTitle}</Title>
      {categories.isError ? (
        <>
          <FormError message={messages.categories.loadError} />
          <Button label={messages.common.retry} onPress={() => categories.refetch()} />
        </>
      ) : (
        <NewTransactionForm
          spaceId={spaceId}
          categories={categories.data}
          onSaved={() => backToSpace(true)}
          onCancel={() => backToSpace(false)}
        />
      )}
    </Screen>
  );
}
