import type { AttachmentList, Attachment as AttachmentResponse } from '@personalfin/api-contract';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { isUuid, parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import { TransactionNotFoundError } from '../transactions/update-transaction.ts';
import { type Attachment, AttachmentNotFoundError, MAX_ATTACHMENT_BYTES } from './attachment.ts';
import { addAttachment, removeAttachment } from './attachment-management.ts';

const BODY_LIMIT = Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 64 * 1024;

const spaceParamsSchema = z.object({ spaceId: z.string() }).loose();
const transactionParamsSchema = z.object({ transactionId: z.string() }).loose();
const attachmentParamsSchema = z.object({ attachmentId: z.string() }).loose();
const uploadSchema = z.strictObject({
  fileName: z.string().trim().min(1).max(200),
  contentBase64: z.string().min(1),
});

function toResponse(attachment: Attachment): AttachmentResponse {
  return {
    id: attachment.id,
    transactionId: attachment.transactionId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    sizeBytes: attachment.sizeBytes,
    sha256: attachment.sha256,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function registerAttachmentRoutes(server: FastifyInstance, data: DataAccess): void {
  async function access(request: FastifyRequest, permission: 'view' | 'record') {
    const user = requireAuthenticatedUser(request);
    const { spaceId } = parseInput(spaceParamsSchema, request.params);
    const space = await requireAccessibleSpace(
      data.repositories.financialSpaces,
      user.id,
      spaceId,
      permission,
    );
    return { userId: user.id, spaceId: space.id };
  }

  function transactionIdOf(request: FastifyRequest): string {
    const { transactionId } = parseInput(transactionParamsSchema, request.params);
    if (!isUuid(transactionId)) {
      throw new TransactionNotFoundError();
    }
    return transactionId;
  }

  function attachmentIdOf(request: FastifyRequest): string {
    const { attachmentId } = parseInput(attachmentParamsSchema, request.params);
    if (!isUuid(attachmentId)) {
      throw new AttachmentNotFoundError();
    }
    return attachmentId;
  }

  server.get(
    '/financial-spaces/:spaceId/transactions/:transactionId/attachments',
    async (request): Promise<AttachmentList> => {
      const { spaceId } = await access(request, 'view');
      const items = await data.repositories.attachments.listForTransaction(
        spaceId,
        transactionIdOf(request),
      );
      return { items: items.map(toResponse) };
    },
  );

  server.post(
    '/financial-spaces/:spaceId/transactions/:transactionId/attachments',
    { bodyLimit: BODY_LIMIT },
    async (request, reply): Promise<AttachmentResponse> => {
      const { userId, spaceId } = await access(request, 'record');
      const input = parseInput(uploadSchema, request.body);
      const attachment = await addAttachment(data, {
        financialSpaceId: spaceId,
        transactionId: transactionIdOf(request),
        actorUserId: userId,
        fileName: input.fileName,
        content: Buffer.from(input.contentBase64, 'base64'),
      });
      reply.status(201);
      return toResponse(attachment);
    },
  );

  server.get(
    '/financial-spaces/:spaceId/attachments/:attachmentId/content',
    async (request, reply) => {
      const { spaceId } = await access(request, 'view');
      const attachmentId = attachmentIdOf(request);
      const [attachment, content] = await Promise.all([
        data.repositories.attachments.find(spaceId, attachmentId),
        data.repositories.attachments.content(spaceId, attachmentId),
      ]);
      if (attachment === null || content === null) {
        throw new AttachmentNotFoundError();
      }
      const safeName = attachment.fileName.replace(/["\\\r\n]/g, '_');
      return reply
        .header('content-type', attachment.contentType)
        .header('content-disposition', `inline; filename="${safeName}"`)
        .header('x-content-type-options', 'nosniff')
        .header('cache-control', 'private, no-store')
        .send(content);
    },
  );

  server.delete('/financial-spaces/:spaceId/attachments/:attachmentId', async (request, reply) => {
    const { userId, spaceId } = await access(request, 'record');
    await removeAttachment(data, {
      financialSpaceId: spaceId,
      attachmentId: attachmentIdOf(request),
      actorUserId: userId,
    });
    return reply.status(204).send();
  });
}
