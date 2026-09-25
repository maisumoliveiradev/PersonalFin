import type { Queryable } from '../../database/pool.ts';
import type { Attachment, AttachmentContentType, AttachmentRepository } from './attachment.ts';

interface AttachmentRow {
  id: string;
  financial_space_id: string;
  transaction_id: string;
  file_name: string;
  content_type: AttachmentContentType;
  size_bytes: number;
  sha256: string;
  created_at: Date;
}

const COLUMNS =
  'id, financial_space_id, transaction_id, file_name, content_type, size_bytes, sha256, created_at';

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    financialSpaceId: row.financial_space_id,
    transactionId: row.transaction_id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    createdAt: row.created_at,
  };
}

export function createPostgresAttachmentRepository(db: Queryable): AttachmentRepository {
  return {
    async listForTransaction(financialSpaceId, transactionId) {
      const { rows } = await db.query<AttachmentRow>(
        `SELECT ${COLUMNS} FROM attachment
         WHERE financial_space_id = $1 AND transaction_id = $2 AND deleted_at IS NULL
         ORDER BY created_at, id`,
        [financialSpaceId, transactionId],
      );
      return rows.map(toAttachment);
    },

    async countForTransaction(financialSpaceId, transactionId) {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM attachment
         WHERE financial_space_id = $1 AND transaction_id = $2 AND deleted_at IS NULL`,
        [financialSpaceId, transactionId],
      );
      return rows[0]?.count ?? 0;
    },

    async create(attachment) {
      const { rows } = await db.query<AttachmentRow>(
        `INSERT INTO attachment (id, financial_space_id, transaction_id, file_name, content_type,
           size_bytes, sha256, content, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${COLUMNS}`,
        [
          attachment.id,
          attachment.financialSpaceId,
          attachment.transactionId,
          attachment.fileName,
          attachment.contentType,
          attachment.sizeBytes,
          attachment.sha256,
          Buffer.from(attachment.content),
          attachment.createdByUserId,
        ],
      );
      const [row] = rows;
      if (row === undefined) {
        throw new Error('Attachment insert returned no row');
      }
      return toAttachment(row);
    },

    async find(financialSpaceId, attachmentId) {
      const { rows } = await db.query<AttachmentRow>(
        `SELECT ${COLUMNS} FROM attachment
         WHERE financial_space_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [financialSpaceId, attachmentId],
      );
      const [row] = rows;
      return row === undefined ? null : toAttachment(row);
    },

    async content(financialSpaceId, attachmentId) {
      const { rows } = await db.query<{ content: Buffer }>(
        `SELECT content FROM attachment
         WHERE financial_space_id = $1 AND id = $2 AND deleted_at IS NULL`,
        [financialSpaceId, attachmentId],
      );
      return rows[0]?.content ?? null;
    },

    async softDelete(financialSpaceId, attachmentId, actorUserId) {
      const { rows } = await db.query<AttachmentRow>(
        `UPDATE attachment SET deleted_at = now(), deleted_by_user_id = $3
         WHERE financial_space_id = $1 AND id = $2 AND deleted_at IS NULL
         RETURNING ${COLUMNS}`,
        [financialSpaceId, attachmentId, actorUserId],
      );
      const [row] = rows;
      return row === undefined ? null : toAttachment(row);
    },
  };
}
