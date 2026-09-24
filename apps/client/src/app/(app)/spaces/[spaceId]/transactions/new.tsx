import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCategories } from '../../../../../api/categories';
import { useCreateTransaction } from '../../../../../api/transactions';
import {
  emptyTransactionFormValues,
  TransactionForm,
} from '../../../../../features/transactions/TransactionForm';
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
  const createTransaction = useCreateTransaction(spaceId);
  const [initialValues] = useState(emptyTransactionFormValues);

  function backToSpace(saved: boolean): void {
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params: saved ? { spaceId, saved: 'created' } : { spaceId },
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
        <TransactionForm
          categories={categories.data}
          initialValues={initialValues}
          submitting={createTransaction.isPending}
          submitError={createTransaction.error}
          onSubmit={(request) =>
            createTransaction.mutate(request, { onSuccess: () => backToSpace(true) })
          }
          onCancel={() => backToSpace(false)}
        />
      )}
    </Screen>
  );
}
