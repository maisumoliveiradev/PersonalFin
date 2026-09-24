import type { CategoryKind } from '@personalfin/api-contract';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { findCategoryNode, useCategories, useCreateCategory } from '../../../../../api/categories';
import {
  describeCategoryError,
  validateCategoryName,
} from '../../../../../features/categories/category-errors';
import { messages } from '../../../../../i18n/messages';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { type Option, OptionGroup } from '../../../../../ui/OptionGroup';
import { Screen } from '../../../../../ui/Screen';
import { TextField } from '../../../../../ui/TextField';
import { Title } from '../../../../../ui/Title';

const KIND_OPTIONS: readonly Option<CategoryKind>[] = [
  { value: 'expense', label: messages.categories.expenseKind },
  { value: 'income', label: messages.categories.incomeKind },
];

export default function NewCategoryScreen() {
  const router = useRouter();
  const { spaceId, parentCategoryId } = useLocalSearchParams<{
    spaceId: string;
    parentCategoryId?: string;
  }>();
  const categories = useCategories(spaceId);
  const createCategory = useCreateCategory(spaceId);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (categories.isPending) {
    return <LoadingScreen />;
  }

  const parent =
    parentCategoryId === undefined || !categories.isSuccess
      ? null
      : findCategoryNode(categories.data, parentCategoryId);

  function handleSubmit(): void {
    const error = validateCategoryName(name);
    setValidationError(error);
    if (error !== null) {
      return;
    }
    createCategory.mutate(
      parent === null
        ? { name: name.trim(), kind }
        : { name: name.trim(), parentCategoryId: parent.id },
      {
        onSuccess: () => router.back(),
      },
    );
  }

  return (
    <Screen>
      <Title>
        {parent === null
          ? messages.categories.newCategoryTitle
          : messages.categories.newSubcategoryTitle(parent.name)}
      </Title>
      <TextField
        label={messages.categories.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={60}
        onSubmitEditing={handleSubmit}
      />
      {parent === null && (
        <OptionGroup
          label={messages.categories.kindLabel}
          options={KIND_OPTIONS}
          selected={kind}
          onSelect={setKind}
        />
      )}
      <FormError message={validationError ?? describeCategoryError(createCategory.error)} />
      <Button
        label={messages.categories.createAction}
        onPress={handleSubmit}
        loading={createCategory.isPending}
      />
      <Button
        label={messages.transactions.cancelAction}
        variant="link"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
