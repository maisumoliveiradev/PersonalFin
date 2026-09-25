import { StyleSheet, Text, View } from 'react-native';

import { messages } from '../../i18n/messages';
import { useIsOnline } from '../../local/connectivity';
import { syncNow, useSyncSnapshot } from '../../sync/sync-engine';
import { Button } from '../../ui/Button';
import { fontSize, spacing, usePalette } from '../../ui/theme';

interface SyncStatusProps {
  spaceId: string;
}

export function SyncStatus({ spaceId }: SyncStatusProps) {
  const palette = usePalette();
  const online = useIsOnline();
  const sync = useSyncSnapshot();
  const entries = sync.entries.filter((entry) => entry.spaceId === spaceId);
  const waiting = entries.filter((entry) => entry.state === 'pending').length;
  const attention = entries.length - waiting;

  const lines: string[] = [];
  if (sync.blocked) {
    lines.push(messages.sync.blocked);
  }
  if (!online && waiting > 0) {
    lines.push(messages.sync.statusOffline(messages.sync.changes(waiting)));
  } else if (sync.syncing && waiting > 0) {
    lines.push(messages.sync.statusSyncing);
  } else if (waiting > 0) {
    lines.push(messages.sync.statusPending(messages.sync.changes(waiting)));
  }
  if (attention > 0) {
    lines.push(messages.sync.statusAttention(attention));
  }
  if (lines.length === 0 && online && sync.lastSyncedAt !== null) {
    lines.push(messages.sync.statusSynced);
  }
  if (!online) {
    lines.push(messages.sync.offlineOnlyTransactions);
  }
  if (lines.length === 0) {
    return null;
  }

  return (
    <View role="status" aria-live="polite" style={styles.container}>
      {lines.map((line) => (
        <Text key={line} style={[styles.text, { color: palette.textMuted }]}>
          {line}
        </Text>
      ))}
      {online && waiting > 0 && !sync.syncing && (
        <Button label={messages.sync.syncNowAction} variant="link" onPress={() => void syncNow()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  text: { fontSize: fontSize.caption },
});
