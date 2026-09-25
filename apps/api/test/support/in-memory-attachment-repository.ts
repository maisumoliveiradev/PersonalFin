import type { Attachment, AttachmentRepository } from '../../src/modules/attachments/attachment.ts';

export function createInMemoryAttachmentRepository(): AttachmentRepository {
  const stored: (Attachment & { content: Buffer; deleted: boolean })[] = [];
  const active = (financialSpaceId: string) =>
    stored.filter((item) => !item.deleted && item.financialSpaceId === financialSpaceId);
  const strip = ({
    content: _content,
    deleted: _deleted,
    ...attachment
  }: (typeof stored)[number]) => attachment;
  return {
    async listForTransaction(financialSpaceId, transactionId) {
      return active(financialSpaceId)
        .filter((item) => item.transactionId === transactionId)
        .map(strip);
    },
    async countForTransaction(financialSpaceId, transactionId) {
      return active(financialSpaceId).filter((item) => item.transactionId === transactionId).length;
    },
    async create({ content, createdByUserId: _createdBy, ...attachment }) {
      const created = {
        ...attachment,
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, stored.length)),
        content: Buffer.from(content),
        deleted: false,
      };
      stored.push(created);
      return strip(created);
    },
    async find(financialSpaceId, attachmentId) {
      const found = active(financialSpaceId).find((item) => item.id === attachmentId);
      return found === undefined ? null : strip(found);
    },
    async content(financialSpaceId, attachmentId) {
      return active(financialSpaceId).find((item) => item.id === attachmentId)?.content ?? null;
    },
    async softDelete(financialSpaceId, attachmentId) {
      const found = active(financialSpaceId).find((item) => item.id === attachmentId);
      if (found === undefined) {
        return null;
      }
      found.deleted = true;
      return strip(found);
    },
  };
}
