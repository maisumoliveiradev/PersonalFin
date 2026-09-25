import type { Tag } from '@personalfin/api-contract';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useDeleteTag, useTags, useUpdateTag } from '../../../../../api/tags';
import { describeTagError, validateTagName } from '../../../../../features/tags/tag-errors';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { StatusMessage } from '../../../../../ui/StatusMessage';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function TagDetailScreen() {
  const router = useRouter();
  const { spaceId, tagId } = useLocalSearchParams<{ spaceId: string; tagId: string }>();
  const tags = useTags(spaceId);

  if (tags.isPending) {
    return <LoadingScreen />;
  }
  const tag = tags.data?.find((item) => item.id === tagId);
  if (tag === undefined) {
    return (
      <Screen>
        <FormError message={messages.tags.notFound} />
        <Button
          label={messages.tags.backToTags}
          variant="link"
          onPress={() =>
            router.dismissTo({ pathname: '/spaces/[spaceId]/tags', params: { spaceId } })
          }
        />
      </Screen>
    );
  }
  return <TagEditor key={tag.id} spaceId={spaceId} tag={tag} />;
}

function TagEditor({ spaceId, tag }: { spaceId: string; tag: Tag }) {
  const router = useRouter();
  const [name, setName] = useState(tag.name);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateTag = useUpdateTag(spaceId, tag.id);
  const deleteTag = useDeleteTag(spaceId, tag.id);

  function backToTags(): void {
    router.dismissTo({ pathname: '/spaces/[spaceId]/tags', params: { spaceId } });
  }

  function saveName(): void {
    const error = validateTagName(name);
    setValidationError(error);
    if (error === null) {
      updateTag.mutate({ version: tag.version, name: name.trim() });
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteTag.mutateAsync(tag.version);
      backToTags();
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{tag.name}</Title>
      {tag.archived && <BodyText muted>{messages.tags.archivedTag}</BodyText>}
      {updateTag.isSuccess && <StatusMessage>{messages.tags.saved}</StatusMessage>}
      <TextField
        label={messages.tags.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={40}
      />
      <FormError
        message={validationError ?? describeTagError(updateTag.error ?? deleteTag.error)}
      />
      <Button label={messages.tags.saveAction} onPress={saveName} />
      <Button
        label={tag.archived ? messages.tags.unarchiveAction : messages.tags.archiveAction}
        variant="link"
        onPress={() => updateTag.mutate({ version: tag.version, archived: !tag.archived })}
      />
      {confirmingDelete ? (
        <>
          <BodyText>{messages.tags.deleteConfirmation}</BodyText>
          <Button
            label={messages.tags.confirmDeleteAction}
            variant="danger"
            loading={deleteTag.isPending}
            onPress={handleDelete}
          />
          <Button
            label={messages.tags.keepAction}
            variant="link"
            onPress={() => setConfirmingDelete(false)}
          />
        </>
      ) : (
        <Button
          label={messages.tags.deleteAction}
          variant="link"
          onPress={() => setConfirmingDelete(true)}
        />
      )}
      <Button label={messages.tags.backToTags} variant="link" onPress={backToTags} />
    </Screen>
  );
}
