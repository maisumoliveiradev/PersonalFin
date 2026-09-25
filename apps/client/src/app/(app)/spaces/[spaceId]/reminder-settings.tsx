import {
  REMINDER_KINDS,
  REMINDER_OFFSETS,
  type ReminderKind,
  type ReminderOffset,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useReminderSettings, useSaveReminderSettings } from '../../../../api/reminders';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { CheckboxGroup } from '../../../../ui/CheckboxGroup';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { Screen } from '../../../../ui/Screen';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { Title } from '../../../../ui/Title';

const OFFSET_OPTIONS = REMINDER_OFFSETS.map((offset) => ({
  value: String(offset),
  label: messages.reminders.offsets[String(offset)] ?? String(offset),
}));

const KIND_OPTIONS = REMINDER_KINDS.map((kind) => ({
  value: kind,
  label: messages.reminders.kinds[kind] ?? kind,
}));

function toggle<Value>(values: readonly Value[], value: Value): Value[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export default function ReminderSettingsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const settings = useReminderSettings(spaceId);
  const save = useSaveReminderSettings(spaceId);
  const [offsets, setOffsets] = useState<string[] | null>(null);
  const [kinds, setKinds] = useState<ReminderKind[] | null>(null);
  const [saved, setSaved] = useState(false);

  if (settings.isPending) {
    return <LoadingScreen />;
  }

  const selectedOffsets = offsets ?? (settings.data?.offsets ?? []).map(String);
  const selectedKinds = kinds ?? settings.data?.kinds ?? [];

  async function handleSave(): Promise<void> {
    setSaved(false);
    try {
      await save.mutateAsync({
        offsets: selectedOffsets.map(Number) as ReminderOffset[],
        kinds: selectedKinds,
      });
      setSaved(true);
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{messages.reminders.settingsTitle}</Title>
      <BodyText muted>{messages.reminders.settingsHint}</BodyText>
      {settings.isError && <FormError message={messages.reminders.loadError} />}
      {saved && <StatusMessage>{messages.reminders.saved}</StatusMessage>}
      <CheckboxGroup
        label={messages.reminders.offsetsLabel}
        options={OFFSET_OPTIONS}
        selected={selectedOffsets}
        onToggle={(value) => setOffsets(toggle(selectedOffsets, value))}
      />
      <CheckboxGroup
        label={messages.reminders.kindsLabel}
        options={KIND_OPTIONS}
        selected={selectedKinds}
        onToggle={(value) => setKinds(toggle(selectedKinds, value))}
      />
      <FormError message={save.isError ? messages.reminders.saveError : null} />
      <Button label={messages.reminders.saveAction} loading={save.isPending} onPress={handleSave} />
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
