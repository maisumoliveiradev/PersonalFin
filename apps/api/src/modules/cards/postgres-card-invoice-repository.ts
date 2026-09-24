import type { FinancialDate } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { CardInvoice, DueInvoice } from './card-invoice.ts';
import type { CardInvoiceRepository } from './card-invoice-repository.ts';

interface CardInvoiceRow {
  id: string;
  card_id: string;
  financial_space_id: string;
  reference_month: FinancialDate;
  closing_date: FinancialDate;
  due_date: FinancialDate;
  version: number;
  total_minor: string;
}

const INVOICE_COLUMNS = `i.id, i.card_id, i.financial_space_id, i.reference_month,
         i.closing_date, i.due_date, i.version,
         COALESCE((
           SELECT SUM(t.amount_minor) FROM financial_transaction t
           WHERE t.card_invoice_id = i.id AND t.deleted_at IS NULL
         ), 0) AS total_minor`;

function toInvoice(row: CardInvoiceRow): CardInvoice {
  const totalMinor = Number(row.total_minor);
  if (!Number.isSafeInteger(totalMinor)) {
    throw new RangeError('Invoice total exceeds the safe integer range');
  }
  return {
    id: row.id,
    cardId: row.card_id,
    financialSpaceId: row.financial_space_id,
    referenceMonth: row.reference_month.slice(0, 7),
    closingDate: row.closing_date,
    dueDate: row.due_date,
    version: row.version,
    totalMinor,
  };
}

export function createPostgresCardInvoiceRepository(db: Queryable): CardInvoiceRepository {
  async function findByMonth(
    financialSpaceId: string,
    cardId: string,
    referenceMonth: string,
    options?: { lock: boolean },
  ): Promise<CardInvoice | null> {
    if (options?.lock === true) {
      await db.query(
        `SELECT id FROM card_invoice
         WHERE financial_space_id = $1 AND card_id = $2 AND reference_month = $3::date
         FOR UPDATE`,
        [financialSpaceId, cardId, `${referenceMonth}-01`],
      );
    }
    const { rows } = await db.query<CardInvoiceRow>(
      `SELECT ${INVOICE_COLUMNS} FROM card_invoice i
       WHERE i.financial_space_id = $1 AND i.card_id = $2 AND i.reference_month = $3::date`,
      [financialSpaceId, cardId, `${referenceMonth}-01`],
    );
    const [row] = rows;
    return row === undefined ? null : toInvoice(row);
  }

  return {
    findByMonth,

    async ensure(invoice) {
      await db.query(
        `INSERT INTO card_invoice
           (id, card_id, financial_space_id, reference_month, closing_date, due_date)
         VALUES ($1, $2, $3, $4::date, $5, $6)
         ON CONFLICT (card_id, reference_month) DO NOTHING`,
        [
          invoice.id,
          invoice.cardId,
          invoice.financialSpaceId,
          `${invoice.referenceMonth}-01`,
          invoice.closingDate,
          invoice.dueDate,
        ],
      );
      const stored = await findByMonth(
        invoice.financialSpaceId,
        invoice.cardId,
        invoice.referenceMonth,
      );
      if (stored === null) {
        throw new Error('Card invoice could not be read back');
      }
      return stored;
    },

    async updateDates({ financialSpaceId, invoiceId, expectedVersion, closingDate, dueDate }) {
      const result = await db.query<{ card_id: string; reference_month: FinancialDate }>(
        `UPDATE card_invoice SET closing_date = $4, due_date = $5,
           version = version + 1, updated_at = now()
         WHERE financial_space_id = $1 AND id = $2 AND version = $3
         RETURNING card_id, reference_month`,
        [financialSpaceId, invoiceId, expectedVersion, closingDate, dueDate],
      );
      const [row] = result.rows;
      return row === undefined
        ? null
        : findByMonth(financialSpaceId, row.card_id, row.reference_month.slice(0, 7));
    },

    async listOpenDue(financialSpaceId, range) {
      const { rows } = await db.query<CardInvoiceRow & { card_name: string }>(
        `SELECT * FROM (
           SELECT ${INVOICE_COLUMNS}, c.name AS card_name
           FROM card_invoice i JOIN card c ON c.id = i.card_id
           WHERE i.financial_space_id = $1 AND i.due_date >= $2::date AND i.due_date < $3::date
         ) due
         WHERE total_minor > 0
         ORDER BY due_date, card_name, id`,
        [financialSpaceId, range.start, range.endExclusive],
      );
      return rows.map((row): DueInvoice => ({ ...toInvoice(row), cardName: row.card_name }));
    },
  };
}
