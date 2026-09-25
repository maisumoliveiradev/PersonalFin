import { formatDisplayDate } from '@personalfin/domain';
import { useState } from 'react';

import { type GoalSpace, useGoal, useRecordGoalProgress, useUpdateGoal } from '../../api/goals';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { TextField } from '../../ui/TextField';
import { Title } from '../../ui/Title';
import { amountInput, money, percent } from '../debts/debt-form';
import { describeGoalError, parseAccumulated } from './goal-form';

const TIME_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

interface GoalScreenProps {
  spaceId: GoalSpace;
  goalId: string;
  canEdit: boolean;
  onBack: () => void;
}

export function GoalScreen({ spaceId, goalId, canEdit, onBack }: GoalScreenProps) {
  const goal = useGoal(spaceId, goalId);
  const recordProgress = useRecordGoalProgress(spaceId, goalId);
  const updateGoal = useUpdateGoal(spaceId, goalId);
  const [accumulated, setAccumulated] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const back = <Button label={messages.goals.backToGoals} variant="link" onPress={onBack} />;

  if (goal.isPending) {
    return <LoadingScreen />;
  }
  if (goal.isError) {
    return (
      <Screen>
        <FormError message={messages.goals.notFound} />
        {back}
      </Screen>
    );
  }

  const current = goal.data;
  const value = accumulated ?? amountInput(current.accumulatedMinor);

  async function handleSave(): Promise<void> {
    const parsed = parseAccumulated(value);
    if (!parsed.ok) {
      setValidationError(parsed.error);
      return;
    }
    setValidationError(null);
    setSaved(false);
    try {
      await recordProgress.mutateAsync({
        version: current.version,
        accumulatedMinor: parsed.value,
      });
      setAccumulated(null);
      setSaved(true);
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{current.name}</Title>
      {current.archived && <BodyText muted>{messages.goals.archivedTag}</BodyText>}
      {current.summary.reached && <StatusMessage>{messages.goals.reachedTag}</StatusMessage>}
      <ProgressBar
        label={messages.goals.progressLabel(current.name, percent(current.summary.progressTenths))}
        tenths={current.summary.progressTenths}
      />
      <BodyText>
        {messages.goals.subtitle(
          money(current.accumulatedMinor),
          money(current.targetAmountMinor),
          percent(current.summary.progressTenths),
        )}
      </BodyText>
      {!current.summary.reached && (
        <BodyText muted>{messages.goals.remaining(money(current.summary.remainingMinor))}</BodyText>
      )}
      {current.targetDate !== null && (
        <BodyText muted>
          {messages.goals.targetDate(formatDisplayDate(current.targetDate, 'pt-BR'))}
        </BodyText>
      )}
      {canEdit && (
        <>
          <SectionTitle>{messages.goals.updateTitle}</SectionTitle>
          {saved && <StatusMessage>{messages.goals.updated}</StatusMessage>}
          <TextField
            label={messages.goals.accumulatedLabel}
            value={value}
            onChangeText={setAccumulated}
            inputMode="decimal"
          />
          <FormError message={validationError ?? describeGoalError(recordProgress.error)} />
          <Button
            label={messages.goals.updateAction}
            loading={recordProgress.isPending}
            onPress={handleSave}
          />
        </>
      )}
      <SectionTitle>{messages.goals.historyTitle}</SectionTitle>
      {current.progress.length === 0 && <BodyText muted>{messages.goals.noHistory}</BodyText>}
      {current.progress.map((entry) => (
        <BodyText key={entry.recordedAt}>
          {messages.goals.historyItem(
            money(entry.accumulatedMinor),
            TIME_FORMAT.format(new Date(entry.recordedAt)),
          )}
        </BodyText>
      ))}
      <FormError message={describeGoalError(updateGoal.error)} />
      {canEdit && (
        <Button
          label={current.archived ? messages.goals.unarchiveAction : messages.goals.archiveAction}
          variant="link"
          loading={updateGoal.isPending}
          onPress={() =>
            updateGoal.mutate({ version: current.version, archived: !current.archived })
          }
        />
      )}
      {back}
    </Screen>
  );
}
