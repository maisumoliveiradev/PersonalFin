import type { Transaction } from '@personalfin/api-contract';
import { useState } from 'react';

import { useDeleteTransaction } from '../../api/transactions';
import { messages } from '../../i18n/messages';
import { isNetworkFailure, isOffline, queueDelete } from '../../sync/offline-writes';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';

interface DeleteTransactionSectionProps {
  spaceId: string;
  transaction: Transaction;
  onDeleted: () => void;
  onQueued: () => void;
}

export function DeleteTransactionSection({
  spaceId,
  transaction,
  onDeleted,
  onQueued,
}: DeleteTransactionSectionProps) {
  const [confirming, setConfirming] = useState(false);
  const [queueFailed, setQueueFailed] = useState(false);
  const deleteTransaction = useDeleteTransaction(spaceId, transaction.id);

  async function deleteOnDevice(): Promise<void> {
    try {
      await queueDelete(spaceId, transaction);
      onQueued();
    } catch {
      setQueueFailed(true);
    }
  }

  async function handleDelete(): Promise<void> {
    if (isOffline()) {
      await deleteOnDevice();
      return;
    }
    try {
      await deleteTransaction.mutateAsync(transaction.version);
      onDeleted();
    } catch (error) {
      if (isNetworkFailure(error)) {
        deleteTransaction.reset();
        await deleteOnDevice();
      }
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
        message={
          deleteTransaction.isError || queueFailed
            ? messages.transactions.errors.deleteFailed
            : null
        }
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
