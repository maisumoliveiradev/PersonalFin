import type { Attachment } from '@personalfin/api-contract';
import { useState } from 'react';

import { ApiRequestError } from '../../api/api-client';
import {
  useAddAttachment,
  useAttachments,
  useOpenAttachment,
  useRemoveAttachment,
} from '../../api/attachments';
import { messages } from '../../i18n/messages';
import { useIsOnline } from '../../local/connectivity';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { saveFile } from '../files/save-file';
import { pickFile } from '../imports/pick-file';
import type { PickedFile } from '../imports/pick-file-types';
import { CAN_TAKE_PHOTO, takePhoto } from './take-photo';

const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

function sizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(Math.round((bytes * 10) / (1024 * 1024)) / 10).toString().replace('.', ',')} MB`;
}

interface AttachmentsSectionProps {
  spaceId: string;
  transactionId: string;
  canEdit: boolean;
}

export function AttachmentsSection({ spaceId, transactionId, canEdit }: AttachmentsSectionProps) {
  const online = useIsOnline();
  const attachments = useAttachments(spaceId, transactionId);
  const add = useAddAttachment(spaceId, transactionId);
  const remove = useRemoveAttachment(spaceId);
  const open = useOpenAttachment(spaceId);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(source: () => Promise<PickedFile | null>): Promise<void> {
    setError(null);
    setStatus(null);
    const file = await source().catch(() => null);
    if (file === null) {
      return;
    }
    try {
      await add.mutateAsync({ fileName: file.name, contentBase64: file.contentBase64 });
      setStatus(messages.attachments.added);
    } catch (failure) {
      setError(
        (failure instanceof ApiRequestError && messages.attachments.errors[failure.code]) ||
          messages.attachments.failed,
      );
    }
  }

  async function show(attachment: Attachment): Promise<void> {
    setError(null);
    try {
      const bytes = await open.mutateAsync(attachment.id);
      await saveFile(bytes, attachment.fileName, attachment.contentType);
    } catch {
      setError(messages.attachments.failed);
    }
  }

  async function discard(attachment: Attachment): Promise<void> {
    setError(null);
    setStatus(null);
    try {
      await remove.mutateAsync(attachment.id);
      setStatus(messages.attachments.removed);
    } catch {
      setError(messages.attachments.failed);
    }
  }

  const items = attachments.data ?? [];
  return (
    <>
      <SectionTitle>{messages.attachments.title}</SectionTitle>
      <BodyText muted>{messages.attachments.hint}</BodyText>
      {status !== null && <StatusMessage>{status}</StatusMessage>}
      <FormError message={error} />
      {attachments.isSuccess && items.length === 0 && (
        <BodyText muted>{messages.attachments.empty}</BodyText>
      )}
      {items.map((attachment) => (
        <BodyText key={attachment.id}>
          {messages.attachments.item(attachment.fileName, sizeLabel(attachment.sizeBytes))}
        </BodyText>
      ))}
      {items.map((attachment) => (
        <Button
          key={`open-${attachment.id}`}
          label={messages.attachments.openLabel}
          accessibilityLabel={messages.attachments.openAction(attachment.fileName)}
          variant="link"
          onPress={() => void show(attachment)}
        />
      ))}
      {canEdit &&
        online &&
        items.map((attachment) => (
          <Button
            key={`remove-${attachment.id}`}
            label={messages.attachments.removeLabel}
            accessibilityLabel={messages.attachments.removeAction(attachment.fileName)}
            variant="link"
            onPress={() => void discard(attachment)}
          />
        ))}
      {canEdit && !online && <BodyText muted>{messages.attachments.offline}</BodyText>}
      {canEdit && online && (
        <>
          <Button
            label={messages.attachments.addFileAction}
            variant="link"
            loading={add.isPending}
            onPress={() => void upload(() => pickFile(ATTACHMENT_TYPES))}
          />
          {CAN_TAKE_PHOTO && (
            <Button
              label={messages.attachments.takePhotoAction}
              variant="link"
              onPress={() => void upload(takePhoto)}
            />
          )}
        </>
      )}
    </>
  );
}
