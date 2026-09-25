import type { Transaction } from '@personalfin/api-contract';
import { useState } from 'react';

import { useCancelInstallments } from '../../api/cards';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';

interface CancelInstallmentsSectionProps {
  spaceId: string;
  transaction: Transaction;
}

export function CancelInstallmentsSection({
  spaceId,
  transaction,
}: CancelInstallmentsSectionProps) {
  const cancel = useCancelInstallments(spaceId);
  const [confirming, setConfirming] = useState(false);
  const { installment, cardPurchase } = transaction;
  if (installment === null || cardPurchase === null || installment.number === installment.count) {
    return null;
  }

  async function handleConfirm(purchaseId: string, afterMonth: string): Promise<void> {
    try {
      await cancel.mutateAsync({ purchaseId, afterMonth });
      setConfirming(false);
    } catch {
      return;
    }
  }

  return (
    <>
      <SectionTitle>{messages.cards.cancelInstallmentsTitle}</SectionTitle>
      {cancel.isSuccess && (
        <StatusMessage>{messages.cards.installmentsCancelled(cancel.data.cancelled)}</StatusMessage>
      )}
      <FormError message={cancel.isError ? messages.cards.errors.cancelFailed : null} />
      {confirming ? (
        <>
          <BodyText>{messages.cards.cancelInstallmentsConfirmation}</BodyText>
          <Button
            label={messages.cards.confirmCancelInstallmentsAction}
            variant="danger"
            loading={cancel.isPending}
            onPress={() => handleConfirm(installment.purchaseId, cardPurchase.invoiceMonth)}
          />
          <Button
            label={messages.cards.keepInstallmentsAction}
            variant="link"
            onPress={() => setConfirming(false)}
          />
        </>
      ) : (
        <Button
          label={messages.cards.cancelInstallmentsAction}
          variant="link"
          onPress={() => setConfirming(true)}
        />
      )}
    </>
  );
}
