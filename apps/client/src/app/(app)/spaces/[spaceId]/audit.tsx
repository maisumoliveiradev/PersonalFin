import type { AuditHistory } from '@personalfin/api-contract';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useAuditHistory } from '../../../../api/audit';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { Title } from '../../../../ui/Title';
import { fontSize, radius, spacing, usePalette } from '../../../../ui/theme';

type AuditItem = AuditHistory['items'][number];

const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function valueLabel(value: string | number | boolean | null): string {
  if (value === null || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? messages.audit.yes : messages.audit.no;
  }
  return String(value);
}

function describeChanges(item: AuditItem): string {
  return Object.entries(item.changes)
    .map(
      ([field, change]) => `${field}: ${valueLabel(change.before)} → ${valueLabel(change.after)}`,
    )
    .join('; ');
}

function AuditRow({ item }: { item: AuditItem }) {
  const palette = usePalette();
  const heading = messages.audit.heading(
    TIME_FORMAT.format(new Date(item.occurredAt)),
    item.actorName,
    messages.audit.entities[item.entityType],
    messages.audit.actions[item.action],
  );
  const details = [
    item.context === null
      ? ''
      : messages.audit.syncContext(
          messages.audit.syncResolutions[item.context.resolution],
          item.context.baseVersion,
        ),
    describeChanges(item),
  ]
    .filter((part) => part !== '')
    .join('. ');
  return (
    <View
      style={[styles.row, { borderColor: palette.border }]}
      aria-label={details === '' ? heading : `${heading}. ${details}`}
    >
      <Text style={[styles.heading, { color: palette.text }]}>{heading}</Text>
      {details !== '' && (
        <Text style={[styles.details, { color: palette.textMuted }]}>{details}</Text>
      )}
    </View>
  );
}

export default function AuditScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const history = useAuditHistory(spaceId);

  if (history.isPending) {
    return <LoadingScreen />;
  }
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Screen>
      <Title>{messages.audit.title}</Title>
      <BodyText muted>{messages.audit.hint}</BodyText>
      {history.isError && <FormError message={messages.audit.loadError} />}
      {history.isSuccess && items.length === 0 && <BodyText muted>{messages.audit.empty}</BodyText>}
      {items.map((item) => (
        <AuditRow key={item.id} item={item} />
      ))}
      {history.hasNextPage && (
        <Button
          label={messages.audit.loadMore}
          variant="link"
          loading={history.isFetchingNextPage}
          onPress={() => history.fetchNextPage()}
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

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4, gap: 2 },
  heading: { fontSize: fontSize.body, fontWeight: '600' },
  details: { fontSize: fontSize.caption },
});
