import type { CreateTransactionRequest } from '@personalfin/api-contract';
import { type FinancialDate, monthOf } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCategories } from '../../../../../api/categories';
import { useCreateRecurrence } from '../../../../../api/recurrences';
import { useCreateTransaction } from '../../../../../api/transactions';
import {
  emptyTransactionFormValues,
  type RecurrenceChoice,
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
  const createRecurrence = useCreateRecurrence(spaceId);
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

  async function handleSubmit(
    request: CreateTransactionRequest,
    recurrence: RecurrenceChoice | null,
  ): Promise<void> {
    try {
      if (recurrence === null) {
        const created = await createTransaction.mutateAsync(request);
        backToSpace(created.financialDate);
        return;
      }
      const { series, occurrencesCreated } = await createRecurrence.mutateAsync({
        type: request.type,
        description: request.description,
        amountMinor: request.amountMinor,
        categoryId: request.categoryId,
        subcategoryId: request.subcategoryId ?? null,
        frequency: recurrence.frequency,
        nonBusinessDayRule: recurrence.nonBusinessDayRule,
        startDate: request.financialDate,
        endDate: recurrence.endDate,
      });
      router.dismissTo({
        pathname: '/spaces/[spaceId]',
        params: {
          spaceId,
          saved: 'recurrence',
          count: String(occurrencesCreated),
          month: monthOf(series.startDate),
        },
      });
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
          submitting={createTransaction.isPending || createRecurrence.isPending}
          submitError={createTransaction.error ?? createRecurrence.error}
          allowRecurrence
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      )}
    </Screen>
  );
}
