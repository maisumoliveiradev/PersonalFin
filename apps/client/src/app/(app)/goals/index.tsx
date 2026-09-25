import { useRouter } from 'expo-router';

import { GoalsScreen } from '../../../features/goals/GoalsScreen';

export default function GlobalGoalsScreen() {
  const router = useRouter();
  return <GoalsScreen spaceId={null} canEdit onBack={() => router.dismissTo('/')} />;
}
