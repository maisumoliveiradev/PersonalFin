import type { SpacePermission } from '@personalfin/api-contract';
import { formatDisplayDate, PERMISSION_PRESETS, type PermissionPreset } from '@personalfin/domain';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ApiRequestError } from '../../../../api/api-client';
import { useFinancialSpace } from '../../../../api/financial-spaces';
import { useCancelInvitation, useCreateInvitation, useInvitations } from '../../../../api/members';
import { can } from '../../../../features/financial-spaces/permissions';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { type Option, OptionGroup } from '../../../../ui/OptionGroup';
import { Screen } from '../../../../ui/Screen';
import { SectionTitle } from '../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { TextField } from '../../../../ui/TextField';
import { Title } from '../../../../ui/Title';
import { fontSize, usePalette } from '../../../../ui/theme';

const PRESET_OPTIONS: readonly Option<PermissionPreset>[] = (
  ['viewer', 'contributor', 'administrator'] as const
).map((preset) => ({ value: preset, label: messages.members.presets[preset] }));

const INVITATION_ERRORS: Record<string, string> = {
  ALREADY_MEMBER: messages.members.errors.alreadyMember,
  INVITATION_PENDING: messages.members.errors.pending,
  VALIDATION_FAILED: messages.members.errors.emailInvalid,
  PERMISSION_DENIED: messages.common.permissionDenied,
};

function describeError(error: Error | null): string | null {
  if (error === null) {
    return null;
  }
  return error instanceof ApiRequestError
    ? (INVITATION_ERRORS[error.code] ?? messages.members.errors.unexpected)
    : messages.members.errors.unexpected;
}

export default function MembersScreen() {
  const router = useRouter();
  const palette = usePalette();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const space = useFinancialSpace(spaceId);
  const canManage = can(space.data, 'manage_members');
  const invitations = useInvitations(spaceId, canManage);
  const createInvitation = useCreateInvitation(spaceId);
  const cancelInvitation = useCancelInvitation(spaceId);
  const [email, setEmail] = useState('');
  const [preset, setPreset] = useState<PermissionPreset>('contributor');
  const [link, setLink] = useState<string | null>(null);

  if (space.isPending) {
    return <LoadingScreen />;
  }

  async function handleInvite(): Promise<void> {
    setLink(null);
    try {
      const created = await createInvitation.mutateAsync({
        email: email.trim(),
        permissions: [...PERMISSION_PRESETS[preset]] as SpacePermission[],
      });
      setLink(Linking.createURL(`/invite/${created.token}`));
      setEmail('');
    } catch {
      return;
    }
  }

  const pending = (invitations.data ?? []).filter((invitation) => invitation.status === 'pending');

  return (
    <Screen>
      <Title>{messages.members.title}</Title>
      {!canManage && <BodyText muted>{messages.common.permissionDenied}</BodyText>}
      {canManage && (
        <>
          <SectionTitle>{messages.members.inviteTitle}</SectionTitle>
          <BodyText muted>{messages.members.inviteHint}</BodyText>
          <TextField
            label={messages.members.emailLabel}
            value={email}
            onChangeText={setEmail}
            inputMode="email"
          />
          <OptionGroup
            label={messages.members.presetLabel}
            options={PRESET_OPTIONS}
            selected={preset}
            onSelect={setPreset}
          />
          <BodyText muted>{messages.members.presetHints[preset]}</BodyText>
          <FormError message={describeError(createInvitation.error)} />
          <Button
            label={messages.members.inviteAction}
            onPress={handleInvite}
            loading={createInvitation.isPending}
          />
          {link !== null && (
            <>
              <StatusMessage>{messages.members.linkCreated}</StatusMessage>
              <Text
                selectable
                aria-label={messages.members.linkLabel}
                style={{ color: palette.text, fontSize: fontSize.body }}
              >
                {link}
              </Text>
            </>
          )}
          <SectionTitle>{messages.members.pendingTitle}</SectionTitle>
          {pending.length === 0 && <BodyText muted>{messages.members.noPending}</BodyText>}
          {pending.map((invitation) => (
            <Button
              key={invitation.id}
              variant="link"
              label={messages.members.cancelInvitation(
                invitation.email,
                formatDisplayDate(invitation.expiresAt.slice(0, 10), 'pt-BR'),
              )}
              loading={cancelInvitation.isPending && cancelInvitation.variables === invitation.id}
              onPress={() => cancelInvitation.mutate(invitation.id)}
            />
          ))}
        </>
      )}
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
