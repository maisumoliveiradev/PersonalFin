import { AppError, NotFoundError } from '../../http/errors.ts';

export const ATTACHMENT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;
export type AttachmentContentType = (typeof ATTACHMENT_CONTENT_TYPES)[number];

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TRANSACTION = 10;

export interface Attachment {
  id: string;
  financialSpaceId: string;
  transactionId: string;
  fileName: string;
  contentType: AttachmentContentType;
  sizeBytes: number;
  sha256: string;
  createdAt: Date;
}

export interface AttachmentRepository {
  listForTransaction(financialSpaceId: string, transactionId: string): Promise<Attachment[]>;
  countForTransaction(financialSpaceId: string, transactionId: string): Promise<number>;
  create(
    attachment: Omit<Attachment, 'createdAt'> & { content: Uint8Array; createdByUserId: string },
  ): Promise<Attachment>;
  find(financialSpaceId: string, attachmentId: string): Promise<Attachment | null>;
  content(financialSpaceId: string, attachmentId: string): Promise<Buffer | null>;
  softDelete(
    financialSpaceId: string,
    attachmentId: string,
    actorUserId: string,
  ): Promise<Attachment | null>;
}

export class AttachmentNotFoundError extends NotFoundError {
  constructor() {
    super('ATTACHMENT_NOT_FOUND', 'Attachment not found');
  }
}

export class AttachmentRejectedError extends AppError {
  override name = 'AttachmentRejectedError';

  constructor(code: string, message: string) {
    super(422, code, message);
  }
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

export function detectContentType(bytes: Uint8Array): AttachmentContentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return 'application/pdf';
  }
  const brand = new TextDecoder('latin1').decode(bytes.subarray(8, 12));
  if (
    startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4) &&
    ['heic', 'heix', 'mif1', 'heim'].includes(brand)
  ) {
    return 'image/heic';
  }
  return null;
}
