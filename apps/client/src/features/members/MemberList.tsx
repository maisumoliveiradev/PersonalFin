import type { Member, SpacePermission } from '@personalfin/api-contract';
import { presetOf, SPACE_PERMISSIONS } from '@personalfin/domain';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiRequestError } from '../../api/api-client';
import { useChangeMemberPermissions, useMembers, useRemoveMember } from '../../api/members';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { CheckboxGroup } from '../../ui/CheckboxGroup';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

const PERMISSION_OPTIONS = SPACE_PERMISSIONS.filter((permission) => permission !== 'view').map(
  (permission) => ({ value: permission, label: messages.members.permissions[permission] }),
);

function accessLabel(member: Member): string {
  if (member.role === 'owner') {
    return messages.spaces.ownerRole;
  }
  const preset = presetOf(member.permissions);
  return preset === null ? messages.members.customAccess : messages.members.presets[preset];
}

function MemberCard({
  spaceId,
  member,
  canManage,
}: {
  spaceId: string;
  member: Member;
  canManage: boolean;
}) {
  const palette = usePalette();
  const change = useChangeMemberPermissions(spaceId);
  const remove = useRemoveMember(spaceId);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const editable = canManage && member.role === 'member' && member.version !== null;
  const failure = change.error ?? remove.error;
  let error: string | null = null;
  if (failure instanceof ApiRequestError && failure.code === 'VERSION_CONFLICT') {
    error = messages.members.errors.conflict;
  } else if (failure !== null) {
    error = messages.members.errors.unexpected;
  }

  function toggle(permission: SpacePermission): void {
    if (member.version === null) {
      return;
    }
    const permissions = member.permissions.includes(permission)
      ? member.permissions.filter((item) => item !== permission)
      : [...member.permissions, permission];
    change.mutate({ userId: member.userId, version: member.version, permissions });
  }

  return (
    <View
      style={[styles.card, { borderColor: palette.border }]}
      aria-label={`${member.name}: ${accessLabel(member)}`}
    >
      <Text style={[styles.name, { color: palette.text }]}>{member.name}</Text>
      <Text style={[styles.detail, { color: palette.textMuted }]}>
        {`${member.email} · ${accessLabel(member)}`}
      </Text>
      {editable && (
        <CheckboxGroup
          label={messages.members.permissionsOf(member.name)}
          options={PERMISSION_OPTIONS}
          selected={member.permissions}
          onToggle={toggle}
        />
      )}
      <FormError message={error} />
      {editable && member.version !== null && confirmingRemoval && (
        <>
          <BodyText>{messages.members.removeConfirmation(member.name)}</BodyText>
          <Button
            label={messages.members.confirmRemoveAction}
            variant="danger"
            loading={remove.isPending}
            onPress={() =>
              member.version !== null &&
              remove.mutate({ userId: member.userId, version: member.version })
            }
          />
          <Button
            label={messages.members.keepAction}
            variant="link"
            onPress={() => setConfirmingRemoval(false)}
          />
        </>
      )}
      {editable && !confirmingRemoval && (
        <Button
          label={messages.members.removeAction(member.name)}
          variant="link"
          onPress={() => setConfirmingRemoval(true)}
        />
      )}
    </View>
  );
}

export function MemberList({ spaceId, canManage }: { spaceId: string; canManage: boolean }) {
  const members = useMembers(spaceId);
  return (
    <>
      <SectionTitle>{messages.members.listTitle}</SectionTitle>
      {members.isError && <FormError message={messages.members.errors.unexpected} />}
      {(members.data ?? []).map((member) => (
        <MemberCard key={member.userId} spaceId={spaceId} member={member} canManage={canManage} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  name: { fontSize: fontSize.body, fontWeight: '600' },
  detail: { fontSize: fontSize.caption },
});
