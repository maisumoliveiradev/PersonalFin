import { useState } from 'react';

import { useDeleteTransaction } from '../../api/transactions';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';

interface DeleteTransactionSectionProps {
  spaceId: string;
  transactionId: string;
  version: number;
  onDeleted: () => void;
}

export function DeleteTransactionSection({
  spaceId,
  transactionId,
  version,
  onDeleted,
}: DeleteTransactionSectionProps) {
  const [confirming, setConfirming] = useState(false);
  const deleteTransaction = useDeleteTransaction(spaceId, transactionId);

  async function handleDelete(): Promise<void> {
    try {
      await deleteTransaction.mutateAsync(version);
      onDeleted();
    } catch {
      return;
    }
  }

  if (!confirming) {
    return (
      <Button
        label={messages.transactions.deleteAction}
        variant="link"
        onPress={() => setConfirming(true)}
      />
    );
  }

  return (
    <>
      <BodyText>{messages.transactions.deleteConfirmation}</BodyText>
      <FormError
        message={deleteTransaction.isError ? messages.transactions.errors.deleteFailed : null}
      />
      <Button
        label={messages.transactions.confirmDeleteAction}
        variant="danger"
        loading={deleteTransaction.isPending}
        onPress={handleDelete}
      />
      <Button
        label={messages.transactions.keepAction}
        variant="link"
        onPress={() => setConfirming(false)}
      />
    </>
  );
}
