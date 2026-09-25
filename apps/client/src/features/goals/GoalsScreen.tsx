import { useRouter } from 'expo-router';
import { useState } from 'react';

import { type GoalSpace, useCreateGoal, useGoals } from '../../api/goals';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { ListItem } from '../../ui/ListItem';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { ProgressBar } from '../../ui/ProgressBar';
import { Screen } from '../../ui/Screen';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { TextField } from '../../ui/TextField';
import { Title } from '../../ui/Title';
import { money, percent } from '../debts/debt-form';
import { describeGoalError, parseGoalForm } from './goal-form';

interface GoalsScreenProps {
  spaceId: GoalSpace;
  canEdit: boolean;
  onBack: () => void;
}

export function GoalsScreen({ spaceId, canEdit, onBack }: GoalsScreenProps) {
  const router = useRouter();
  const goals = useGoals(spaceId);
  const createGoal = useCreateGoal(spaceId);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function openGoal(goalId: string): void {
    if (spaceId === null) {
      router.push({ pathname: '/goals/[goalId]', params: { goalId } });
    } else {
      router.push({ pathname: '/spaces/[spaceId]/goals/[goalId]', params: { spaceId, goalId } });
    }
  }

  async function handleCreate(): Promise<void> {
    const parsed = parseGoalForm({ name, target, targetDate });
    if (!parsed.ok) {
      setValidationError(parsed.error);
      return;
    }
    setValidationError(null);
    setCreated(false);
    try {
      await createGoal.mutateAsync(parsed.value);
      setName('');
      setTarget('');
      setTargetDate('');
      setCreated(true);
    } catch {
      return;
    }
  }

  if (goals.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{spaceId === null ? messages.goals.globalTitle : messages.goals.spaceTitle}</Title>
      <BodyText muted>
        {spaceId === null ? messages.goals.globalHint : messages.goals.spaceHint}
      </BodyText>
      {goals.isError && <FormError message={messages.goals.loadError} />}
      {goals.isSuccess && goals.data.length === 0 && (
        <BodyText muted>{messages.goals.empty}</BodyText>
      )}
      {goals.isSuccess &&
        goals.data.map((goal) => (
          <ListItem
            key={goal.id}
            title={goal.name}
            subtitle={[
              goal.archived ? messages.goals.archivedTag : null,
              goal.summary.reached ? messages.goals.reachedTag : null,
              messages.goals.subtitle(
                money(goal.accumulatedMinor),
                money(goal.targetAmountMinor),
                percent(goal.summary.progressTenths),
              ),
            ]
              .filter((part): part is string => part !== null)
              .join(' — ')}
            accessibilityHint={messages.goals.openHint}
            onPress={() => openGoal(goal.id)}
          />
        ))}
      {goals.isSuccess &&
        goals.data.map((goal) => (
          <ProgressBar
            key={`progress-${goal.id}`}
            label={messages.goals.progressLabel(goal.name, percent(goal.summary.progressTenths))}
            tenths={goal.summary.progressTenths}
          />
        ))}
      {canEdit && (
        <>
          <SectionTitle>{messages.goals.newTitle}</SectionTitle>
          {created && <StatusMessage>{messages.goals.created}</StatusMessage>}
          <TextField
            label={messages.goals.nameLabel}
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
          <TextField
            label={messages.goals.targetLabel}
            value={target}
            onChangeText={setTarget}
            placeholder="0,00"
            inputMode="decimal"
          />
          <TextField
            label={messages.goals.targetDateLabel}
            hint={messages.transactions.dateHint}
            value={targetDate}
            onChangeText={setTargetDate}
            inputMode="numeric"
            maxLength={10}
          />
          <FormError message={validationError ?? describeGoalError(createGoal.error)} />
          <Button
            label={messages.goals.createAction}
            loading={createGoal.isPending}
            onPress={handleCreate}
          />
        </>
      )}
      <Button
        label={spaceId === null ? messages.goals.backToSpaces : messages.spaces.backToSpace}
        variant="link"
        onPress={onBack}
      />
    </Screen>
  );
}
