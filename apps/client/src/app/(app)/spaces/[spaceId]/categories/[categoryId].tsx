import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import {
  type CategoryNode,
  findCategoryNode,
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '../../../../../api/categories';
import {
  describeCategoryError,
  validateCategoryName,
} from '../../../../../features/categories/category-errors';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { ListItem } from '../../../../../ui/ListItem';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { SectionTitle } from '../../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../../ui/StatusMessage';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

export default function CategoryDetailScreen() {
  const router = useRouter();
  const { spaceId, categoryId } = useLocalSearchParams<{ spaceId: string; categoryId: string }>();
  const categories = useCategories(spaceId);

  if (categories.isPending) {
    return <LoadingScreen />;
  }
  const node = categories.isSuccess ? findCategoryNode(categories.data, categoryId) : null;
  if (node === null) {
    return (
      <Screen>
        <FormError message={messages.categories.notFound} />
        <Button
          label={messages.categories.backToCategories}
          variant="link"
          onPress={() =>
            router.dismissTo({ pathname: '/spaces/[spaceId]/categories', params: { spaceId } })
          }
        />
      </Screen>
    );
  }
  return <CategoryEditor key={node.id} spaceId={spaceId} node={node} />;
}

function CategoryEditor({ spaceId, node }: { spaceId: string; node: CategoryNode }) {
  const router = useRouter();
  const [name, setName] = useState(node.name);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateCategory = useUpdateCategory(spaceId, node.id);
  const deleteCategory = useDeleteCategory(spaceId, node.id);

  function saveName(): void {
    const error = validateCategoryName(name);
    setValidationError(error);
    if (error === null) {
      updateCategory.mutate({ version: node.version, name: name.trim() });
    }
  }

  function backToCategories(): void {
    router.dismissTo({ pathname: '/spaces/[spaceId]/categories', params: { spaceId } });
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteCategory.mutateAsync(node.version);
      backToCategories();
    } catch {
      return;
    }
  }

  const error =
    validationError ?? describeCategoryError(updateCategory.error ?? deleteCategory.error);

  return (
    <Screen>
      <Title>{node.name}</Title>
      {node.parent !== null && <BodyText muted>{node.parent.name}</BodyText>}
      {node.archived && <BodyText muted>{messages.categories.archivedTag}</BodyText>}
      {updateCategory.isSuccess && <StatusMessage>{messages.categories.saved}</StatusMessage>}
      <TextField
        label={messages.categories.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={60}
        onSubmitEditing={saveName}
      />
      <FormError message={error} />
      <Button
        label={messages.categories.saveNameAction}
        onPress={saveName}
        loading={updateCategory.isPending && updateCategory.variables?.name !== undefined}
      />
      <Button
        label={
          node.archived ? messages.categories.unarchiveAction : messages.categories.archiveAction
        }
        variant="link"
        onPress={() => updateCategory.mutate({ version: node.version, archived: !node.archived })}
      />
      {node.parent === null && (
        <>
          <SectionTitle>{messages.categories.subcategoriesTitle}</SectionTitle>
          {node.subcategories.length === 0 && (
            <BodyText muted>{messages.categories.noSubcategories}</BodyText>
          )}
          {node.subcategories.map((subcategory) => (
            <ListItem
              key={subcategory.id}
              title={subcategory.name}
              {...(subcategory.archived ? { subtitle: messages.categories.archivedTag } : {})}
              accessibilityHint={messages.categories.openHint}
              onPress={() =>
                router.push({
                  pathname: '/spaces/[spaceId]/categories/[categoryId]',
                  params: { spaceId, categoryId: subcategory.id },
                })
              }
            />
          ))}
          {!node.archived && (
            <Button
              label={messages.categories.newSubcategoryAction}
              variant="link"
              onPress={() =>
                router.push({
                  pathname: '/spaces/[spaceId]/categories/new',
                  params: { spaceId, parentCategoryId: node.id },
                })
              }
            />
          )}
        </>
      )}
      {confirmingDelete ? (
        <>
          <BodyText>{messages.categories.deleteConfirmation}</BodyText>
          <Button
            label={messages.categories.confirmDeleteAction}
            variant="danger"
            loading={deleteCategory.isPending}
            onPress={handleDelete}
          />
          <Button
            label={messages.categories.keepAction}
            variant="link"
            onPress={() => setConfirmingDelete(false)}
          />
        </>
      ) : (
        <Button
          label={messages.categories.deleteAction}
          variant="link"
          onPress={() => setConfirmingDelete(true)}
        />
      )}
      <Button
        label={messages.categories.backToCategories}
        variant="link"
        onPress={backToCategories}
      />
    </Screen>
  );
}
