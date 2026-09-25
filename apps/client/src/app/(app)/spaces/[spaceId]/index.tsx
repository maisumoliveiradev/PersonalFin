import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCategories } from '../../../../api/categories';
import { useFinancialSpace } from '../../../../api/financial-spaces';
import { ALL_SECTIONS, useDashboardPreferences } from '../../../../api/preferences';
import { useMaterializeRecurrences } from '../../../../api/recurrences';
import { useTags } from '../../../../api/tags';
import { BalanceSummary } from '../../../../features/balance/BalanceSummary';
import { BalanceUpdatePrompt } from '../../../../features/balance/BalanceUpdatePrompt';
import { MonthlyDashboard } from '../../../../features/dashboard/MonthlyDashboard';
import { ProjectionSeries } from '../../../../features/dashboard/ProjectionSeries';
import { can, roleLabel } from '../../../../features/financial-spaces/permissions';
import { PendingChanges } from '../../../../features/sync/PendingChanges';
import { SyncStatus } from '../../../../features/sync/SyncStatus';
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
  const tags = useTags(spaceId);
  const preferences = useDashboardPreferences(spaceId);
  const sections = preferences.data?.sections ?? ALL_SECTIONS;
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
      <BodyText muted>{roleLabel(space.data)}</BodyText>
      {saved === 'created' && <StatusMessage>{messages.transactions.saved}</StatusMessage>}
      {saved === 'updated' && <StatusMessage>{messages.transactions.updated}</StatusMessage>}
      {saved === 'deleted' && <StatusMessage>{messages.transactions.deleted}</StatusMessage>}
      {saved === 'queued-create' && <StatusMessage>{messages.sync.queued.create}</StatusMessage>}
      {saved === 'queued-update' && <StatusMessage>{messages.sync.queued.update}</StatusMessage>}
      {saved === 'queued-delete' && <StatusMessage>{messages.sync.queued.delete}</StatusMessage>}
      <SyncStatus spaceId={space.data.id} />
      {saved === 'recurrence' && (
        <StatusMessage>{messages.recurrences.created(Number(params.count ?? 0))}</StatusMessage>
      )}
      {can(space.data, 'record') && <BalanceUpdatePrompt spaceId={space.data.id} />}
      {sections.observedBalance && (
        <BalanceSummary spaceId={space.data.id} canRecord={can(space.data, 'record')} />
      )}
      {can(space.data, 'record') && (
        <Button
          label={messages.transactions.newAction}
          onPress={() =>
            router.push({ pathname: '/spaces/[spaceId]/transactions/new', params: { spaceId } })
          }
        />
      )}
      <MonthNavigator
        month={month}
        onChange={(nextMonth) => changeFilters({ ...filters, month: nextMonth })}
      />
      {(sections.realized || sections.forecast || sections.projection) && (
        <MonthlyDashboard spaceId={space.data.id} month={month} sections={sections} />
      )}
      {sections.projectionSeries && <ProjectionSeries spaceId={space.data.id} fromMonth={month} />}
      <PendingChanges spaceId={space.data.id} />
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
          tags={tags.data ?? []}
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
      <TransactionList
        spaceId={space.data.id}
        filters={filters}
        canRecord={can(space.data, 'record')}
      />
      <Button
        label={messages.transactions.trashAction}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/trash', params: { spaceId, month } })
        }
      />
      {sections.commitments && (
        <Button
          label={messages.commitments.action}
          variant="link"
          onPress={() =>
            router.push({ pathname: '/spaces/[spaceId]/commitments', params: { spaceId } })
          }
        />
      )}
      {sections.analytics && (
        <Button
          label={messages.analytics.action}
          variant="link"
          onPress={() =>
            router.push({ pathname: '/spaces/[spaceId]/analytics', params: { spaceId, month } })
          }
        />
      )}
      <Button
        label={messages.cards.action}
        variant="link"
        onPress={() => router.push({ pathname: '/spaces/[spaceId]/cards', params: { spaceId } })}
      />
      <Button
        label={messages.goals.spaceAction}
        variant="link"
        onPress={() => router.push({ pathname: '/spaces/[spaceId]/goals', params: { spaceId } })}
      />
      <Button
        label={messages.debts.action}
        variant="link"
        onPress={() => router.push({ pathname: '/spaces/[spaceId]/debts', params: { spaceId } })}
      />
      <Button
        label={messages.recurrences.listAction}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/recurrences', params: { spaceId } })
        }
      />
      <Button
        label={messages.members.action}
        variant="link"
        onPress={() => router.push({ pathname: '/spaces/[spaceId]/members', params: { spaceId } })}
      />
      {can(space.data, 'view_audit') && (
        <Button
          label={messages.audit.action}
          variant="link"
          onPress={() => router.push({ pathname: '/spaces/[spaceId]/audit', params: { spaceId } })}
        />
      )}
      <Button
        label={messages.preferences.action}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/dashboard-preferences', params: { spaceId } })
        }
      />
      <Button
        label={messages.tags.action}
        variant="link"
        onPress={() => router.push({ pathname: '/spaces/[spaceId]/tags', params: { spaceId } })}
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
