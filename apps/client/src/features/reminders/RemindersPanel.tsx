import type { Reminder } from '@personalfin/api-contract';
import { financialDateFromLocalClock } from '@personalfin/domain';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useDismissReminder, useReminders } from '../../api/reminders';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';
import { money } from '../debts/debt-form';

function describe(reminder: Reminder): string {
  const amount = money(reminder.amountMinor);
  const due = messages.reminders.due(reminder.daysUntilDue);
  if (reminder.kind === 'invoices') {
    return messages.reminders.invoice(reminder.description, amount, due);
  }
  if (reminder.kind === 'debts') {
    return messages.reminders.debt(reminder.description, amount, due);
  }
  if (reminder.kind === 'projection') {
    return messages.reminders.projection(amount);
  }
  const type =
    reminder.transactionType === 'income'
      ? messages.transactions.income
      : messages.transactions.expense;
  return messages.reminders.transaction(type, reminder.description, amount, due);
}

interface RemindersPanelProps {
  spaceId: string;
}

export function RemindersPanel({ spaceId }: RemindersPanelProps) {
  const palette = usePalette();
  const router = useRouter();
  const reminders = useReminders(spaceId, financialDateFromLocalClock(new Date()));
  const dismiss = useDismissReminder(spaceId);
  const items = reminders.data ?? [];

  return (
    <View role="region" aria-label={messages.reminders.title} style={styles.container}>
      {items.length > 0 && <SectionTitle>{messages.reminders.title}</SectionTitle>}
      {items.map((reminder) => {
        const text = describe(reminder);
        const overdue = reminder.stage === 'overdue' || reminder.kind === 'projection';
        return (
          <View
            key={`${reminder.key}|${reminder.stage}`}
            style={[
              styles.item,
              {
                borderColor: overdue ? palette.danger : palette.warning,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Text style={[styles.text, { color: overdue ? palette.danger : palette.text }]}>
              {text}
            </Text>
            <Button
              label={messages.reminders.dismissLabel}
              accessibilityLabel={messages.reminders.dismissAction(text)}
              variant="link"
              onPress={() => dismiss.mutate({ key: reminder.key, stage: reminder.stage })}
            />
          </View>
        );
      })}
      <Button
        label={messages.reminders.settingsAction}
        variant="link"
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/reminder-settings', params: { spaceId } })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  item: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4, gap: spacing.xs },
  text: { fontSize: fontSize.body },
});
