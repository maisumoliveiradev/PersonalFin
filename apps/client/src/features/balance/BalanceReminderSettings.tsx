import type { BalanceReminder } from '@personalfin/api-contract';
import type { BalanceReminderFrequency } from '@personalfin/domain';
import { useState } from 'react';

import { useSaveBalanceReminder } from '../../api/balance';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { TextField } from '../../ui/TextField';

const FREQUENCY_OPTIONS: readonly Option<BalanceReminderFrequency>[] = [
  { value: 'app_start', label: messages.balance.reminderAppStart },
  { value: 'daily', label: messages.balance.reminderDaily },
  { value: 'every_n_days', label: messages.balance.reminderEveryNDays },
  { value: 'never', label: messages.balance.reminderNever },
];

interface BalanceReminderSettingsProps {
  spaceId: string;
  current: BalanceReminder;
}

export function BalanceReminderSettings({ spaceId, current }: BalanceReminderSettingsProps) {
  const [frequency, setFrequency] = useState<BalanceReminderFrequency>(current.frequency);
  const [intervalText, setIntervalText] = useState(String(current.intervalDays ?? 7));
  const [validationError, setValidationError] = useState<string | null>(null);
  const saveReminder = useSaveBalanceReminder(spaceId);

  function handleSave(): void {
    if (frequency !== 'every_n_days') {
      setValidationError(null);
      saveReminder.mutate({ frequency, intervalDays: null });
      return;
    }
    const days = Number(intervalText);
    if (!/^\d{1,2}$/.test(intervalText.trim()) || days < 1 || days > 90) {
      setValidationError(messages.balance.reminderIntervalInvalid);
      return;
    }
    setValidationError(null);
    saveReminder.mutate({ frequency, intervalDays: days });
  }

  return (
    <>
      <SectionTitle>{messages.balance.reminderTitle}</SectionTitle>
      <OptionGroup
        label={messages.balance.reminderFrequency}
        options={FREQUENCY_OPTIONS}
        selected={frequency}
        onSelect={setFrequency}
      />
      {frequency === 'every_n_days' && (
        <TextField
          label={messages.balance.reminderIntervalLabel}
          value={intervalText}
          onChangeText={setIntervalText}
          inputMode="numeric"
          maxLength={2}
        />
      )}
      {saveReminder.isSuccess && <StatusMessage>{messages.balance.reminderSaved}</StatusMessage>}
      <FormError
        message={
          validationError ?? (saveReminder.isError ? messages.balance.reminderSaveFailed : null)
        }
      />
      <Button
        label={messages.balance.reminderSaveAction}
        variant="link"
        loading={saveReminder.isPending}
        onPress={handleSave}
      />
    </>
  );
}
