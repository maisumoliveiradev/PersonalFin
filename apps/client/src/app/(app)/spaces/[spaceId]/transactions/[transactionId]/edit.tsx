import type { CreateTransactionRequest } from '@personalfin/api-contract';
import { type FinancialDate, monthOf } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCards } from '../../../../../../api/cards';
import { useCategories } from '../../../../../../api/categories';
import { useRecurrences, useUpdateRecurrence } from '../../../../../../api/recurrences';
import { useTags } from '../../../../../../api/tags';
import { useTransaction, useUpdateTransaction } from '../../../../../../api/transactions';
import { CancelInstallmentsSection } from '../../../../../../features/cards/CancelInstallmentsSection';
import { DeleteTransactionSection } from '../../../../../../features/transactions/DeleteTransactionSection';
import { TransactionForm } from '../../../../../../features/transactions/TransactionForm';
import { transactionToFormValues } from '../../../../../../features/transactions/transaction-form';
import { messages } from '../../../../../../i18n/messages';
import { useIsOnline } from '../../../../../../local/connectivity';
import { isNetworkFailure, isOffline, queueUpdate } from '../../../../../../sync/offline-writes';
import { useSyncSnapshot } from '../../../../../../sync/sync-engine';
import { changesFromRequest } from '../../../../../../sync/transaction-sync-fields';
import { BodyText } from '../../../../../../ui/BodyText';
import { Button } from '../../../../../../ui/Button';
import { FormError } from '../../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../../ui/LoadingScreen';
import { type Option, OptionGroup } from '../../../../../../ui/OptionGroup';
import { Screen } from '../../../../../../ui/Screen';
import { Title } from '../../../../../../ui/Title';

type Scope = 'this' | 'following';

const SCOPE_OPTIONS: readonly Option<Scope>[] = [
  { value: 'this', label: messages.recurrences.onlyThis },
  { value: 'following', label: messages.recurrences.thisAndFollowing },
];

export default function EditTransactionScreen() {
  const router = useRouter();
  const { spaceId, transactionId } = useLocalSearchParams<{
    spaceId: string;
    transactionId: string;
  }>();
  const categories = useCategories(spaceId);
  const tags = useTags(spaceId);
  const cards = useCards(spaceId);
  const transaction = useTransaction(spaceId, transactionId);
  const recurrences = useRecurrences(spaceId);
  const updateTransaction = useUpdateTransaction(spaceId, transactionId);
  const updateRecurrence = useUpdateRecurrence(spaceId);
  const [scope, setScope] = useState<Scope>('this');
  const [scopeError, setScopeError] = useState<string | null>(null);
  const online = useIsOnline();
  const sync = useSyncSnapshot();
  const queued = sync.entries.some((entry) => entry.transactionId === transactionId);

  function backToSpace(
    saved?: 'updated' | 'deleted' | 'queued-update' | 'queued-delete',
    financialDate?: FinancialDate,
  ): void {
    router.dismissTo({
      pathname: '/spaces/[spaceId]',
      params: {
        spaceId,
        ...(saved === undefined ? {} : { saved }),
        ...(financialDate === undefined ? {} : { month: monthOf(financialDate) }),
      },
    });
  }

  if (categories.isPending || transaction.isPending || cards.isPending) {
    return <LoadingScreen />;
  }

  if (categories.isError || transaction.isError) {
    return (
      <Screen>
        <FormError message={messages.transactions.errors.notFound} />
        <Button label={messages.spaces.backToSpaces} variant="link" onPress={() => backToSpace()} />
      </Screen>
    );
  }

  const current = transaction.data;
  const series =
    current.recurrenceSeriesId === null
      ? undefined
      : recurrences.data?.find((item) => item.id === current.recurrenceSeriesId);
  const canApplyToFollowing =
    online &&
    series !== undefined &&
    current.occurrenceDate !== null &&
    current.status === 'pending';

  if (queued) {
    return (
      <Screen>
        <Title>{messages.transactions.editTitle}</Title>
        <BodyText>{messages.sync.lockedHint}</BodyText>
        <Button label={messages.spaces.backToSpaces} variant="link" onPress={() => backToSpace()} />
      </Screen>
    );
  }

  async function saveEditOnDevice(request: CreateTransactionRequest): Promise<void> {
    const changes = changesFromRequest(current, request);
    if (Object.keys(changes).length === 0) {
      backToSpace();
      return;
    }
    try {
      await queueUpdate(spaceId, current, changes);
    } catch {
      setScopeError(messages.sync.blocked);
      return;
    }
    backToSpace('queued-update', request.financialDate);
  }

  const applyToFollowing = scope === 'following' && canApplyToFollowing;

  async function handleSubmit(request: CreateTransactionRequest): Promise<void> {
    try {
      if (applyToFollowing && series !== undefined && current.occurrenceDate !== null) {
        if (
          request.type !== current.type ||
          request.financialDate !== current.financialDate ||
          request.status !== current.status
        ) {
          setScopeError(messages.recurrences.errors.followingOnlyDefaults);
          return;
        }
        setScopeError(null);
        await updateRecurrence.mutateAsync({
          seriesId: series.id,
          version: series.version,
          fromOccurrenceDate: current.occurrenceDate,
          description: request.description,
          amountMinor: request.amountMinor,
          categoryId: request.categoryId,
          subcategoryId: request.subcategoryId ?? null,
        });
        backToSpace('updated', current.financialDate);
        return;
      }
      if (isOffline()) {
        await saveEditOnDevice(request);
        return;
      }
      const { cardId: _cardId, ...changes } = request;
      const updated = await updateTransaction.mutateAsync({ ...changes, version: current.version });
      backToSpace('updated', updated.financialDate);
    } catch (error) {
      if (!applyToFollowing && isNetworkFailure(error)) {
        updateTransaction.reset();
        await saveEditOnDevice(request);
      }
    }
  }

  return (
    <Screen>
      <Title>{messages.transactions.editTitle}</Title>
      {canApplyToFollowing && (
        <>
          <OptionGroup
            label={messages.recurrences.scopeLabel}
            options={SCOPE_OPTIONS}
            selected={scope}
            onSelect={setScope}
          />
          {scope === 'following' && <BodyText muted>{messages.recurrences.followingHint}</BodyText>}
        </>
      )}
      <FormError message={scopeError} />
      <TransactionForm
        key={current.version}
        categories={categories.data}
        initialValues={transactionToFormValues(current)}
        cards={cards.data ?? []}
        tags={tags.data ?? []}
        submitting={updateTransaction.isPending || updateRecurrence.isPending}
        submitError={updateTransaction.error ?? updateRecurrence.error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
      {online && <CancelInstallmentsSection spaceId={spaceId} transaction={current} />}
      <DeleteTransactionSection
        spaceId={spaceId}
        transaction={current}
        onDeleted={() => backToSpace('deleted', current.financialDate)}
        onQueued={() => backToSpace('queued-delete', current.financialDate)}
      />
    </Screen>
  );
}
