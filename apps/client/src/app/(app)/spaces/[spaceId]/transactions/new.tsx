import type { CreateTransactionRequest } from '@personalfin/api-contract';
import { type FinancialDate, monthOf } from '@personalfin/domain';
import { randomUUID } from 'expo-crypto';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCards } from '../../../../../api/cards';
import { useCategories } from '../../../../../api/categories';
import { useCreateRecurrence } from '../../../../../api/recurrences';
import { useTags } from '../../../../../api/tags';
import { useCreateTransaction } from '../../../../../api/transactions';
import {
  emptyTransactionFormValues,
  type RecurrenceChoice,
  TransactionForm,
} from '../../../../../features/transactions/TransactionForm';
import { messages } from '../../../../../i18n/messages';
import { useIsOnline } from '../../../../../local/connectivity';
import { isNetworkFailure, isOffline, queueCreate } from '../../../../../sync/offline-writes';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { Title } from '../../../../../ui/Title';

export default function NewTransactionScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const categories = useCategories(spaceId);
  const tags = useTags(spaceId);
  const cards = useCards(spaceId);
  const createTransaction = useCreateTransaction(spaceId);
  const createRecurrence = useCreateRecurrence(spaceId);
  const [initialValues] = useState(emptyTransactionFormValues);
  const online = useIsOnline();
  const [offlineError, setOfflineError] = useState<string | null>(null);

  function backToSpace(savedDate?: FinancialDate): void {
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params:
        savedDate === undefined
          ? { spaceId }
          : { spaceId, saved: 'created', month: monthOf(savedDate) },
    });
  }

  async function saveOnDevice(request: CreateTransactionRequest & { id: string }): Promise<void> {
    try {
      await queueCreate(spaceId, request);
    } catch {
      setOfflineError(messages.sync.blocked);
      return;
    }
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params: { spaceId, saved: 'queued-create', month: monthOf(request.financialDate) },
    });
  }

  async function handleSubmit(
    request: CreateTransactionRequest,
    recurrence: RecurrenceChoice | null,
  ): Promise<void> {
    setOfflineError(null);
    const needsConnection = recurrence !== null || request.installments !== undefined;
    if (isOffline() && needsConnection) {
      setOfflineError(messages.sync.offlineFormHint);
      return;
    }
    if (isOffline() && request.foreign !== undefined) {
      setOfflineError(messages.currencies.offline);
      return;
    }
    if (recurrence === null && request.installments === undefined) {
      const withId = { ...request, id: randomUUID() };
      if (isOffline()) {
        await saveOnDevice(withId);
        return;
      }
      try {
        const created = await createTransaction.mutateAsync(withId);
        backToSpace(created.financialDate);
      } catch (error) {
        if (isNetworkFailure(error)) {
          createTransaction.reset();
          await saveOnDevice(withId);
        }
      }
      return;
    }
    try {
      if (recurrence === null) {
        const created = await createTransaction.mutateAsync(request);
        backToSpace(created.financialDate);
        return;
      }
      const { series, occurrencesCreated } = await createRecurrence.mutateAsync({
        type: request.type,
        description: request.description,
        amountMinor: request.amountMinor ?? 0,
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
        <>
          {!online && <BodyText muted>{messages.sync.offlineFormHint}</BodyText>}
          <FormError message={offlineError} />
          <TransactionForm
            categories={categories.data}
            initialValues={initialValues}
            submitting={createTransaction.isPending || createRecurrence.isPending}
            submitError={createTransaction.error ?? createRecurrence.error}
            allowRecurrence={online}
            cards={cards.data ?? []}
            tags={tags.data ?? []}
            allowCardChoice
            allowInstallments={online}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        </>
      )}
    </Screen>
  );
}
