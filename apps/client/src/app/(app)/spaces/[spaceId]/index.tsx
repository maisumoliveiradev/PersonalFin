import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCategories } from '../../../../api/categories';
import { useFinancialSpace } from '../../../../api/financial-spaces';
import { useMaterializeRecurrences } from '../../../../api/recurrences';
import { BalanceSummary } from '../../../../features/balance/BalanceSummary';
import { BalanceUpdatePrompt } from '../../../../features/balance/BalanceUpdatePrompt';
import { MonthlyDashboard } from '../../../../features/dashboard/MonthlyDashboard';
import { MonthNavigator } from '../../../../features/transactions/MonthNavigator';
import { TransactionFiltersPanel } from '../../../../features/transactions/TransactionFiltersPanel';
import { TransactionList } from '../../../../features/transactions/TransactionList';
import {
  hasOptionalFilters,
  monthFromParam,
  type TransactionFilters,
} from '../../../../features/transactions/transaction-filters';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { SectionTitle } from '../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { Title } from '../../../../ui/Title';

type OptionalFilters = Omit<TransactionFilters, 'month'>;

export default function FinancialSpaceHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    spaceId: string;
    saved?: string;
    month?: string;
    count?: string;
  }>();
  const { spaceId, saved } = params;
  const month = monthFromParam(params.month);
  const space = useFinancialSpace(spaceId);
  const categories = useCategories(spaceId);
  const materializeRecurrences = useMaterializeRecurrences(spaceId);
  const [optionalFilters, setOptionalFilters] = useState<OptionalFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const filters: TransactionFilters = { ...optionalFilters, month };

  function changeFilters({ month: nextMonth, ...rest }: TransactionFilters): void {
    setOptionalFilters(rest);
    if (nextMonth !== month) {
      router.setParams({ month: nextMonth });
      if (nextMonth > month) {
        materializeRecurrences.mutate(nextMonth);
      }
    }
  }

  const backToSpaces = (
    <Button
      label={messages.spaces.backToSpaces}
      variant="link"
      onPress={() => router.replace('/')}
    />
  );

  if (space.isPending) {
    return <LoadingScreen />;
  }

  if (space.isError) {
    return (
      <Screen>
        <FormError message={messages.spaces.notFound} />
        {backToSpaces}
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{space.data.name}</Title>
      <BodyText muted>{messages.spaces.ownerRole}</BodyText>
      {saved === 'created' && <StatusMessage>{messages.transactions.saved}</StatusMessage>}
      {saved === 'updated' && <StatusMessage>{messages.transactions.updated}</StatusMessage>}
      {saved === 'deleted' && <StatusMessage>{messages.transactions.deleted}</StatusMessage>}
      {saved === 'recurrence' && (
        <StatusMessage>{messages.recurrences.created(Number(params.count ?? 0))}</StatusMessage>
      )}
      <BalanceUpdatePrompt spaceId={space.data.id} />
      <BalanceSummary spaceId={space.data.id} />
      <Button
        label={messages.transactions.newAction}
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/transactions/new', params: { spaceId } })
        }
      />
      <MonthNavigator
        month={month}
        onChange={(nextMonth) => changeFilters({ ...filters, month: nextMonth })}
      />
      <MonthlyDashboard spaceId={space.data.id} month={month} />
      <SectionTitle>{messages.transactions.listTitle}</SectionTitle>
      <Button
        label={
          showFilters
            ? messages.transactions.hideFiltersAction
            : messages.transactions.filtersAction
        }
        variant="link"
        onPress={() => setShowFilters(!showFilters)}
      />
      {showFilters && (
        <TransactionFiltersPanel
          filters={filters}
          categories={categories.data ?? []}
          onChange={changeFilters}
        />
      )}
      {!showFilters && hasOptionalFilters(filters) && (
        <Button
          label={messages.transactions.clearFiltersAction}
          variant="link"
          onPress={() => setOptionalFilters({})}
        />
      )}
      <TransactionList spaceId={space.data.id} filters={filters} />
      <Button
        label={messages.transactions.trashAction}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/trash', params: { spaceId, month } })
        }
      />
      <Button
        label={messages.commitments.action}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/commitments', params: { spaceId } })
        }
      />
      <Button
        label={messages.recurrences.listAction}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/recurrences', params: { spaceId } })
        }
      />
      <Button
        label={messages.categories.manageAction}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/categories', params: { spaceId } })
        }
      />
      {backToSpaces}
    </Screen>
  );
}
