import { useLocalSearchParams, useRouter } from 'expo-router';

import { useDebts } from '../../../../../api/debts';
import { useFinancialSpace } from '../../../../../api/financial-spaces';
import { money, percent } from '../../../../../features/debts/debt-form';
import { can } from '../../../../../features/financial-spaces/permissions';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { ListItem } from '../../../../../ui/ListItem';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { ProgressBar } from '../../../../../ui/ProgressBar';
import { Screen } from '../../../../../ui/Screen';
import { Title } from '../../../../../ui/Title';

export default function DebtsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const debts = useDebts(spaceId);
  const space = useFinancialSpace(spaceId);

  if (debts.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.debts.title}</Title>
      <BodyText muted>{messages.debts.hint}</BodyText>
      {debts.isError && <FormError message={messages.debts.loadError} />}
      {debts.isSuccess && debts.data.length === 0 && (
        <BodyText muted>{messages.debts.empty}</BodyText>
      )}
      {debts.isSuccess &&
        debts.data.map((debt) => (
          <ListItem
            key={debt.id}
            title={debt.name}
            subtitle={[
              debt.archived ? messages.debts.archivedTag : null,
              debt.summary.settled ? messages.debts.settledTag : null,
              messages.debts.outstanding(money(debt.summary.outstandingMinor)),
              messages.debts.progress(percent(debt.summary.progressTenths)),
            ]
              .filter((part): part is string => part !== null)
              .join(' — ')}
            accessibilityHint={messages.debts.openHint}
            onPress={() =>
              router.push({
                pathname: '/spaces/[spaceId]/debts/[debtId]',
                params: { spaceId, debtId: debt.id },
              })
            }
          />
        ))}
      {debts.isSuccess &&
        debts.data.map((debt) => (
          <ProgressBar
            key={`progress-${debt.id}`}
            label={messages.debts.progressLabel(debt.name, percent(debt.summary.progressTenths))}
            tenths={debt.summary.progressTenths}
          />
        ))}
      {space.data !== undefined && can(space.data, 'plan') && (
        <Button
          label={messages.debts.newAction}
          onPress={() =>
            router.push({ pathname: '/spaces/[spaceId]/debts/new', params: { spaceId } })
          }
        />
      )}
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
