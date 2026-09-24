import type { FinancialSpace } from '@personalfin/api-contract';
import { useState } from 'react';

import { useCreateFinancialSpace } from '../../api/financial-spaces';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { TextField } from '../../ui/TextField';

const NAME_MAX_LENGTH = 80;

interface CreateFinancialSpaceFormProps {
  initialName?: string;
  onCreated: (space: FinancialSpace) => void;
  onCancel?: () => void;
}

function validateName(name: string): string | null {
  const normalized = name.trim();
  if (normalized === '') {
    return messages.spaces.errors.nameRequired;
  }
  if (normalized.length > NAME_MAX_LENGTH) {
    return messages.spaces.errors.nameTooLong;
  }
  return null;
}

export function CreateFinancialSpaceForm({
  initialName = '',
  onCreated,
  onCancel,
}: CreateFinancialSpaceFormProps) {
  const [name, setName] = useState(initialName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const createSpace = useCreateFinancialSpace();

  function handleSubmit(): void {
    const error = validateName(name);
    setValidationError(error);
    if (error !== null) {
      return;
    }
    createSpace.mutate({ name: name.trim() }, { onSuccess: onCreated });
  }

  const submitError = createSpace.isError ? messages.spaces.errors.unexpected : null;

  return (
    <>
      <TextField
        label={messages.spaces.nameLabel}
        hint={messages.spaces.nameHint}
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleSubmit}
      />
      <FormError message={validationError ?? submitError} />
      <Button
        label={messages.spaces.createAction}
        onPress={handleSubmit}
        loading={createSpace.isPending}
      />
      {onCancel !== undefined && (
        <Button label={messages.spaces.cancelAction} variant="link" onPress={onCancel} />
      )}
    </>
  );
}
