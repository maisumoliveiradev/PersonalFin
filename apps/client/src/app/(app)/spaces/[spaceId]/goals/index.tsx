import { useLocalSearchParams, useRouter } from 'expo-router';

import { useFinancialSpace } from '../../../../../api/financial-spaces';
import { can } from '../../../../../features/financial-spaces/permissions';
import { GoalsScreen } from '../../../../../features/goals/GoalsScreen';

export default function SpaceGoalsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const space = useFinancialSpace(spaceId);
  return (
    <GoalsScreen
      spaceId={spaceId}
      canEdit={space.data !== undefined && can(space.data, 'plan')}
      onBack={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
    />
  );
}
