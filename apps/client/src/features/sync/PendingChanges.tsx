import { formatDisplayDate, formatMoney } from '@personalfin/domain';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { messages } from '../../i18n/messages';
import type { OutboxEntry } from '../../sync/outbox';
import { discardEntry, retryEntry, useSyncSnapshot } from '../../sync/sync-engine';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

function describeError(entry: OutboxEntry): string | null {
  if (entry.state !== 'error') {
    return null;
  }
  return (entry.errorCode && messages.sync.errors[entry.errorCode]) || messages.sync.unknownError;
}

function PendingChange({ entry }: { entry: OutboxEntry }) {
  const palette = usePalette();
  const [confirming, setConfirming] = useState(false);
  const { summary } = entry;
  const amount = formatMoney({ amountMinor: summary.amountMinor, currency: 'BRL' }, 'pt-BR');
  const date = formatDisplayDate(summary.financialDate, 'pt-BR');
  const kind = messages.sync.kinds[entry.operation.kind];
  const state = messages.sync.states[entry.state];
  const error = describeError(entry);
  const stateColor = entry.state === 'pending' ? palette.textMuted : palette.danger;

  return (
    <View
      aria-label={messages.sync.entryLabel(kind, summary.description, amount, date, state)}
      style={[styles.entry, { borderColor: palette.border }]}
    >
      <Text style={[styles.title, { color: palette.text }]}>
        {kind}: {summary.description}
      </Text>
      <Text style={[styles.meta, { color: palette.textMuted }]}>
        {amount} · {date}
      </Text>
      <Text style={[styles.meta, { color: stateColor }]}>
        {error === null ? state : `${state}: ${error}`}
      </Text>
      {entry.state === 'error' && (
        <Button
          label={messages.sync.retryLabel}
          accessibilityLabel={messages.sync.retryAction(summary.description)}
          variant="link"
          onPress={() => void retryEntry(entry.id)}
        />
      )}
      {confirming ? (
        <>
          <BodyText>{messages.sync.discardConfirmation}</BodyText>
          <Button
            label={messages.sync.confirmDiscardAction}
            variant="danger"
            onPress={() => void discardEntry(entry.id)}
          />
          <Button
            label={messages.sync.keepAction}
            variant="link"
            onPress={() => setConfirming(false)}
          />
        </>
      ) : (
        <Button
          label={messages.sync.discardLabel}
          accessibilityLabel={messages.sync.discardAction(summary.description)}
          variant="link"
          onPress={() => setConfirming(true)}
        />
      )}
    </View>
  );
}

interface PendingChangesProps {
  spaceId: string;
}

export function PendingChanges({ spaceId }: PendingChangesProps) {
  const sync = useSyncSnapshot();
  const entries = sync.entries.filter((entry) => entry.spaceId === spaceId);
  if (entries.length === 0) {
    return null;
  }
  return (
    <View role="region" aria-label={messages.sync.pendingTitle} style={styles.container}>
      <SectionTitle>{messages.sync.pendingTitle}</SectionTitle>
      {entries.map((entry) => (
        <PendingChange key={entry.id} entry={entry} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  entry: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    gap: 2,
  },
  title: { fontSize: fontSize.body, fontWeight: '600' },
  meta: { fontSize: fontSize.caption },
});
