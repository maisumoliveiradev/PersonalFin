import type { Queryable } from '../../database/pool.ts';
import type { InstallmentRepository } from './card-installments.ts';

export function createPostgresInstallmentRepository(db: Queryable): InstallmentRepository {
  return {
    async create(purchase) {
      await db.query(
        `INSERT INTO card_installment_purchase (
           id, financial_space_id, card_id, description, total_minor, currency,
           installment_count, purchase_date, first_invoice_month, created_by_user_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10)`,
        [
          purchase.id,
          purchase.financialSpaceId,
          purchase.cardId,
          purchase.description,
          String(purchase.totalMinor),
          purchase.currency,
          purchase.installmentCount,
          purchase.purchaseDate,
          `${purchase.firstInvoiceMonth}-01`,
          purchase.createdByUserId,
        ],
      );
    },

    async exists(financialSpaceId, purchaseId) {
      const { rowCount } = await db.query(
        'SELECT 1 FROM card_installment_purchase WHERE financial_space_id = $1 AND id = $2',
        [financialSpaceId, purchaseId],
      );
      return rowCount === 1;
    },

    async listCancellable(financialSpaceId, purchaseId, afterMonth) {
      const { rows } = await db.query<{ id: string }>(
        `SELECT t.id FROM financial_transaction t
         JOIN card_invoice i ON i.id = t.card_invoice_id
         WHERE t.financial_space_id = $1 AND t.installment_purchase_id = $2
           AND t.deleted_at IS NULL AND i.reference_month > $3::date
           AND NOT EXISTS (
             SELECT 1 FROM card_invoice_payment p
             WHERE p.invoice_id = i.id AND p.deleted_at IS NULL
           )
         ORDER BY t.installment_number
         FOR UPDATE OF t`,
        [financialSpaceId, purchaseId, `${afterMonth}-01`],
      );
      return rows.map((row) => row.id);
    },

    async softDelete(ids, actorUserId) {
      if (ids.length === 0) {
        return;
      }
      await db.query(
        `UPDATE financial_transaction SET deleted_at = now(), deleted_by_user_id = $2,
           version = version + 1, updated_at = now()
         WHERE id = ANY($1::uuid[])`,
        [ids, actorUserId],
      );
    },
  };
}
