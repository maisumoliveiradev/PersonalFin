import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiRequestError } from '../../../api/api-client';
import { useAcceptInvitation, useInvitationPreview } from '../../../api/members';
import { messages } from '../../../i18n/messages';
import { BodyText } from '../../../ui/BodyText';
import { Button } from '../../../ui/Button';
import { FormError } from '../../../ui/FormError';
import { LoadingScreen } from '../../../ui/LoadingScreen';
import { Screen } from '../../../ui/Screen';
import { Title } from '../../../ui/Title';

const ACCEPT_ERRORS: Record<string, string> = {
  INVITATION_EMAIL_MISMATCH: messages.members.errors.emailMismatch,
  INVITATION_NOT_AVAILABLE: messages.members.errors.notAvailable,
  ALREADY_MEMBER: messages.members.errors.alreadyMember,
};

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation(token);

  if (preview.isPending) {
    return <LoadingScreen />;
  }

  async function handleAccept(): Promise<void> {
    try {
      const { spaceId } = await accept.mutateAsync();
      router.replace({ pathname: '/spaces/[spaceId]', params: { spaceId } });
    } catch {
      return;
    }
  }

  const acceptError =
    accept.error instanceof ApiRequestError
      ? (ACCEPT_ERRORS[accept.error.code] ?? messages.members.errors.unexpected)
      : null;

  return (
    <Screen>
      <Title>{messages.members.acceptTitle}</Title>
      {preview.isError && <FormError message={messages.members.errors.notFound} />}
      {preview.isSuccess && (
        <>
          <BodyText>{messages.members.acceptSummary(preview.data.spaceName)}</BodyText>
          <BodyText muted>{messages.members.acceptEmail(preview.data.email)}</BodyText>
          <BodyText muted>
            {messages.members.acceptPermissions(
              preview.data.permissions
                .map((permission) => messages.members.permissions[permission])
                .join(', '),
            )}
          </BodyText>
          {preview.data.status !== 'pending' && (
            <FormError message={messages.members.errors.notAvailable} />
          )}
          <FormError message={acceptError} />
          {preview.data.status === 'pending' && (
            <Button
              label={messages.members.acceptAction}
              onPress={handleAccept}
              loading={accept.isPending}
            />
          )}
        </>
      )}
      <Button
        label={messages.spaces.backToSpaces}
        variant="link"
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}
