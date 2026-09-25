import type { CreateTransactionRequest } from '@personalfin/api-contract';
import { type FinancialDate, monthOf } from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCards } from '../../../../../../api/cards';
import { useCategories } from '../../../../../../api/categories';
import { useRecurrences, useUpdateRecurrence } from '../../../../../../api/recurrences';
import { useTransaction, useUpdateTransaction } from '../../../../../../api/transactions';
import { CancelInstallmentsSection } from '../../../../../../features/cards/CancelInstallmentsSection';
import { DeleteTransactionSection } from '../../../../../../features/transactions/DeleteTransactionSection';
import { TransactionForm } from '../../../../../../features/transactions/TransactionForm';
import { transactionToFormValues } from '../../../../../../features/transactions/transaction-form';
import { messages } from '../../../../../../i18n/messages';
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
  const cards = useCards(spaceId);
  const transaction = useTransaction(spaceId, transactionId);
  const recurrences = useRecurrences(spaceId);
  const updateTransaction = useUpdateTransaction(spaceId, transactionId);
  const updateRecurrence = useUpdateRecurrence(spaceId);
  const [scope, setScope] = useState<Scope>('this');
  const [scopeError, setScopeError] = useState<string | null>(null);

  function backToSpace(saved?: 'updated' | 'deleted', financialDate?: FinancialDate): void {
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
    series !== undefined && current.occurrenceDate !== null && current.status === 'pending';

  async function handleSubmit(request: CreateTransactionRequest): Promise<void> {
    try {
      if (scope === 'following' && series !== undefined && current.occurrenceDate !== null) {
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
      const { cardId: _cardId, ...changes } = request;
      const updated = await updateTransaction.mutateAsync({ ...changes, version: current.version });
      backToSpace('updated', updated.financialDate);
    } catch {
      return;
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
        submitting={updateTransaction.isPending || updateRecurrence.isPending}
        submitError={updateTransaction.error ?? updateRecurrence.error}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
      <CancelInstallmentsSection spaceId={spaceId} transaction={current} />
      <DeleteTransactionSection
        spaceId={spaceId}
        transactionId={transactionId}
        version={current.version}
        onDeleted={() => backToSpace('deleted', current.financialDate)}
      />
    </Screen>
  );
}
