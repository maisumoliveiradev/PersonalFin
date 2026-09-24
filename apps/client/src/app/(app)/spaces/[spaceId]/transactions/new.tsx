import type { CreateTransactionRequest } from '@personalfin/api-contract';
import { type FinancialDate, monthOf } from '@personalfin/domain';
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

  function backToSpace(savedDate?: FinancialDate): void {
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params:
        savedDate === undefined
          ? { spaceId }
          : { spaceId, saved: 'created', month: monthOf(savedDate) },
    });
  }

  async function handleSubmit(request: CreateTransactionRequest): Promise<void> {
    try {
      const created = await createTransaction.mutateAsync(request);
      backToSpace(created.financialDate);
    } catch {
      return;
    }
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
          onSubmit={handleSubmit}
          onCancel={() => backToSpace()}
        />
      )}
    </Screen>
  );
}
