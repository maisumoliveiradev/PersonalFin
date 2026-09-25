import { useLocalSearchParams, useRouter } from 'expo-router';

import { GoalScreen } from '../../../features/goals/GoalScreen';

export default function GlobalGoalScreen() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  return (
    <GoalScreen spaceId={null} goalId={goalId} canEdit onBack={() => router.dismissTo('/goals')} />
  );
}
