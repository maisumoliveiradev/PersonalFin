import { createHash, randomUUID } from 'node:crypto';

import type { DataAccess } from '../../database/data-access.ts';
import { TransactionNotFoundError } from '../transactions/update-transaction.ts';
import {
  type Attachment,
  AttachmentNotFoundError,
  AttachmentRejectedError,
  detectContentType,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_TRANSACTION,
} from './attachment.ts';

export async function addAttachment(
  data: DataAccess,
  input: {
    financialSpaceId: string;
    transactionId: string;
    actorUserId: string;
    fileName: string;
    content: Uint8Array;
  },
): Promise<Attachment> {
  if (input.content.length === 0 || input.content.length > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentRejectedError('ATTACHMENT_TOO_LARGE', 'Attachments must be 1 byte to 5 MB');
  }
  const contentType = detectContentType(input.content);
  if (contentType === null) {
    throw new AttachmentRejectedError(
      'ATTACHMENT_TYPE_NOT_ALLOWED',
      'Only JPEG, PNG, WebP, HEIC images and PDF documents are accepted',
    );
  }
  return data.transaction(async (repositories) => {
    const transaction = await repositories.transactions.findInSpace(
      input.financialSpaceId,
      input.transactionId,
      { lock: true },
    );
    if (transaction === null || transaction.deletedAt !== null) {
      throw new TransactionNotFoundError();
    }
    const count = await repositories.attachments.countForTransaction(
      input.financialSpaceId,
      transaction.id,
    );
    if (count >= MAX_ATTACHMENTS_PER_TRANSACTION) {
      throw new AttachmentRejectedError(
        'ATTACHMENT_LIMIT_REACHED',
        `A transaction has at most ${MAX_ATTACHMENTS_PER_TRANSACTION} attachments`,
      );
    }
    const attachment = await repositories.attachments.create({
      id: randomUUID(),
      financialSpaceId: input.financialSpaceId,
      transactionId: transaction.id,
      fileName: input.fileName,
      contentType,
      sizeBytes: input.content.length,
      sha256: createHash('sha256').update(input.content).digest('hex'),
      content: input.content,
      createdByUserId: input.actorUserId,
    });
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'attachment',
      entityId: attachment.id,
      action: 'create',
      actorUserId: input.actorUserId,
      changes: {
        transactionId: { before: null, after: transaction.id },
        fileName: { before: null, after: attachment.fileName },
        sizeBytes: { before: null, after: attachment.sizeBytes },
      },
    });
    return attachment;
  });
}

export async function removeAttachment(
  data: DataAccess,
  input: { financialSpaceId: string; attachmentId: string; actorUserId: string },
): Promise<void> {
  await data.transaction(async (repositories) => {
    const removed = await repositories.attachments.softDelete(
      input.financialSpaceId,
      input.attachmentId,
      input.actorUserId,
    );
    if (removed === null) {
      throw new AttachmentNotFoundError();
    }
    await repositories.audit.record({
      financialSpaceId: input.financialSpaceId,
      entityType: 'attachment',
      entityId: removed.id,
      action: 'delete',
      actorUserId: input.actorUserId,
      changes: { fileName: { before: removed.fileName, after: null } },
    });
  });
}
