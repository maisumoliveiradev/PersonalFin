import { useRouter } from 'expo-router';

import { usePlatformOverview } from '../../api/admin';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { Screen } from '../../ui/Screen';
import { SectionTitle } from '../../ui/SectionTitle';
import { Title } from '../../ui/Title';

export default function AdminScreen() {
  const router = useRouter();
  const overview = usePlatformOverview();

  if (overview.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.admin.title}</Title>
      <BodyText muted>{messages.admin.hint}</BodyText>
      {overview.isError && <FormError message={messages.admin.loadError} />}
      {overview.isSuccess && (
        <>
          <SectionTitle>{messages.admin.usersTitle}</SectionTitle>
          <BodyText>{messages.admin.total(overview.data.users.total)}</BodyText>
          <BodyText>{messages.admin.created30(overview.data.users.createdLast30Days)}</BodyText>
          <BodyText>{messages.admin.active30(overview.data.users.activeLast30Days)}</BodyText>
          <SectionTitle>{messages.admin.spacesTitle}</SectionTitle>
          <BodyText>{messages.admin.total(overview.data.spaces.total)}</BodyText>
          <BodyText>{messages.admin.shared(overview.data.spaces.shared)}</BodyText>
          <BodyText>{messages.admin.created30(overview.data.spaces.createdLast30Days)}</BodyText>
          <SectionTitle>{messages.admin.transactionsTitle}</SectionTitle>
          <BodyText>{messages.admin.total(overview.data.transactions.total)}</BodyText>
          <BodyText>
            {messages.admin.created30(overview.data.transactions.createdLast30Days)}
          </BodyText>
          <SectionTitle>{messages.admin.adoptionTitle}</SectionTitle>
          {Object.entries(overview.data.featureAdoption).map(([feature, count]) => (
            <BodyText key={feature}>
              {messages.admin.feature(messages.admin.features[feature] ?? feature, count)}
            </BodyText>
          ))}
          <SectionTitle>{messages.admin.databaseTitle}</SectionTitle>
          <BodyText>
            {messages.admin.migrations(
              overview.data.database.migrations,
              overview.data.database.latestMigration ?? '—',
            )}
          </BodyText>
        </>
      )}
      <Button label={messages.admin.back} variant="link" onPress={() => router.dismissTo('/')} />
    </Screen>
  );
}
