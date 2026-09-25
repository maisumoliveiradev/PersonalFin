import { useLocalSearchParams, useRouter } from 'expo-router';

import { useFinancialSpace } from '../../../../../api/financial-spaces';
import { can } from '../../../../../features/financial-spaces/permissions';
import { GoalScreen } from '../../../../../features/goals/GoalScreen';

export default function SpaceGoalScreen() {
  const router = useRouter();
  const { spaceId, goalId } = useLocalSearchParams<{ spaceId: string; goalId: string }>();
  const space = useFinancialSpace(spaceId);
  return (
    <GoalScreen
      spaceId={spaceId}
      goalId={goalId}
      canEdit={space.data !== undefined && can(space.data, 'plan')}
      onBack={() => router.dismissTo({ pathname: '/spaces/[spaceId]/goals', params: { spaceId } })}
    />
  );
}
