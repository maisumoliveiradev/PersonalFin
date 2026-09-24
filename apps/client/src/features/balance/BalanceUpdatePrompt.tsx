import {
  DEFAULT_BALANCE_REMINDER,
  financialDateFromLocalClock,
  isBalanceUpdateDue,
} from '@personalfin/domain';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useBalanceReminder, useBalanceSnapshots } from '../../api/balance';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { SectionTitle } from '../../ui/SectionTitle';
import { radius, spacing, usePalette } from '../../ui/theme';
import { dismissBalancePrompt, useBalancePromptDismissed } from './prompt-dismissals';

interface BalanceUpdatePromptProps {
  spaceId: string;
}

export function BalanceUpdatePrompt({ spaceId }: BalanceUpdatePromptProps) {
  const palette = usePalette();
  const router = useRouter();
  const snapshots = useBalanceSnapshots(spaceId);
  const reminder = useBalanceReminder(spaceId);
  const dismissed = useBalancePromptDismissed(spaceId);

  if (dismissed || !snapshots.isSuccess || !reminder.isSuccess) {
    return null;
  }
  const due = isBalanceUpdateDue({
    setting: reminder.data ?? DEFAULT_BALANCE_REMINDER,
    lastObservedOn: snapshots.data.current?.observedOn ?? null,
    today: financialDateFromLocalClock(new Date()),
  });
  if (!due) {
    return null;
  }

  return (
    <View
      role="region"
      aria-label={messages.balance.promptTitle}
      style={[styles.card, { borderColor: palette.primary, backgroundColor: palette.surface }]}
    >
      <SectionTitle>{messages.balance.promptTitle}</SectionTitle>
      <BodyText>{messages.balance.promptBody}</BodyText>
      <Button
        label={messages.balance.promptAction}
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/balance/new', params: { spaceId } })
        }
      />
      <Button
        label={messages.balance.laterAction}
        variant="link"
        onPress={() => dismissBalancePrompt(spaceId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 2, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
});
