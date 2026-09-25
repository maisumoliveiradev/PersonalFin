import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateTag, useTags } from '../../../../../api/tags';
import { describeTagError, validateTagName } from '../../../../../features/tags/tag-errors';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { ListItem } from '../../../../../ui/ListItem';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function TagsScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const tags = useTags(spaceId);
  const createTag = useCreateTag(spaceId);
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (tags.isPending) {
    return <LoadingScreen />;
  }

  async function handleCreate(): Promise<void> {
    const error = validateTagName(name);
    setValidationError(error);
    if (error !== null) {
      return;
    }
    try {
      await createTag.mutateAsync(name.trim());
      setName('');
    } catch {
      return;
    }
  }

  return (
    <Screen>
      <Title>{messages.tags.title}</Title>
      <BodyText muted>{messages.tags.hint}</BodyText>
      {tags.isError && <FormError message={messages.tags.loadError} />}
      {tags.isSuccess && tags.data.length === 0 && <BodyText muted>{messages.tags.empty}</BodyText>}
      {tags.isSuccess &&
        tags.data.map((tag) => (
          <ListItem
            key={tag.id}
            title={tag.name}
            {...(tag.archived ? { subtitle: messages.tags.archivedTag } : {})}
            accessibilityHint={messages.tags.openHint}
            onPress={() =>
              router.push({
                pathname: '/spaces/[spaceId]/tags/[tagId]',
                params: { spaceId, tagId: tag.id },
              })
            }
          />
        ))}
      <TextField
        label={messages.tags.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={40}
        onSubmitEditing={handleCreate}
      />
      <FormError message={validationError ?? describeTagError(createTag.error)} />
      <Button
        label={messages.tags.createAction}
        onPress={handleCreate}
        loading={createTag.isPending}
      />
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
