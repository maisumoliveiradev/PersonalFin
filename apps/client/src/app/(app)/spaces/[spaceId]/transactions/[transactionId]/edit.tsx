import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCategories } from '../../../../../../api/categories';
import { useTransaction, useUpdateTransaction } from '../../../../../../api/transactions';
import { TransactionForm } from '../../../../../../features/transactions/TransactionForm';
import { transactionToFormValues } from '../../../../../../features/transactions/transaction-form';
import { messages } from '../../../../../../i18n/messages';
import { Button } from '../../../../../../ui/Button';
import { FormError } from '../../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../../ui/Screen';
import { Title } from '../../../../../../ui/Title';

export default function EditTransactionScreen() {
  const router = useRouter();
  const { spaceId, transactionId } = useLocalSearchParams<{
    spaceId: string;
    transactionId: string;
  }>();
  const categories = useCategories(spaceId);
  const transaction = useTransaction(spaceId, transactionId);
  const updateTransaction = useUpdateTransaction(spaceId, transactionId);

  function backToSpace(saved: boolean): void {
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params: saved ? { spaceId, saved: 'updated' } : { spaceId },
    });
  }

  if (categories.isPending || transaction.isPending) {
    return <LoadingScreen />;
  }

  if (categories.isError || transaction.isError) {
    return (
      <Screen>
        <FormError message={messages.transactions.errors.notFound} />
        <Button
          label={messages.spaces.backToSpaces}
          variant="link"
          onPress={() => backToSpace(false)}
        />
      </Screen>
    );
  }

  const current = transaction.data;

  return (
    <Screen>
      <Title>{messages.transactions.editTitle}</Title>
      <TransactionForm
        key={current.version}
        categories={categories.data}
        initialValues={transactionToFormValues(current)}
        submitting={updateTransaction.isPending}
        submitError={updateTransaction.error}
        onSubmit={(request) =>
          updateTransaction.mutate(
            { ...request, version: current.version },
            { onSuccess: () => backToSpace(true) },
          )
        }
        onCancel={() => backToSpace(false)}
      />
    </Screen>
  );
}
