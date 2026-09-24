import { useRouter } from 'expo-router';

import { CreateFinancialSpaceForm } from '../../../features/financial-spaces/CreateFinancialSpaceForm';
import { messages } from '../../../i18n/messages';
import { Screen } from '../../../ui/Screen';
import { Title } from '../../../ui/Title';

export default function NewFinancialSpaceScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Title>{messages.spaces.newSpaceTitle}</Title>
      <CreateFinancialSpaceForm
        onCreated={(space) =>
          router.replace({ pathname: '/spaces/[spaceId]', params: { spaceId: space.id } })
        }
        onCancel={() => router.back()}
      />
    </Screen>
  );
}
