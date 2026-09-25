import type { CurrencyCode, FinancialDate } from '@personalfin/domain';

import type { Queryable } from '../../database/pool.ts';
import type { CardInvoice, DueInvoice, InvoicePayment } from './card-invoice.ts';
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
  paid_minor: string;
}

interface PaymentRow {
  id: string;
  invoice_id: string;
  financial_space_id: string;
  amount_minor: string;
  currency: CurrencyCode;
  paid_on: FinancialDate;
  recorded_by_user_id: string;
  recorded_at: Date;
}

const PAYMENT_COLUMNS =
  'id, invoice_id, financial_space_id, amount_minor, currency, paid_on, recorded_by_user_id, recorded_at';

function safeAmount(value: string): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError('Invoice amount exceeds the safe integer range');
  }
  return amount;
}

function toPayment(row: PaymentRow): InvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    financialSpaceId: row.financial_space_id,
    amountMinor: safeAmount(row.amount_minor),
    currency: row.currency,
    paidOn: row.paid_on,
    recordedByUserId: row.recorded_by_user_id,
    recordedAt: row.recorded_at,
  };
}

const INVOICE_COLUMNS = `i.id, i.card_id, i.financial_space_id, i.reference_month,
         i.closing_date, i.due_date, i.version, b.total_minor, b.paid_minor`;

const INVOICE_FROM = 'card_invoice i JOIN card_invoice_balance b ON b.invoice_id = i.id';

function toInvoice(row: CardInvoiceRow): CardInvoice {
  return {
    id: row.id,
    cardId: row.card_id,
    financialSpaceId: row.financial_space_id,
    referenceMonth: row.reference_month.slice(0, 7),
    closingDate: row.closing_date,
    dueDate: row.due_date,
    version: row.version,
    totalMinor: safeAmount(row.total_minor),
    paidMinor: safeAmount(row.paid_minor),
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
      `SELECT ${INVOICE_COLUMNS} FROM ${INVOICE_FROM}
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
           FROM ${INVOICE_FROM} JOIN card c ON c.id = i.card_id
           WHERE i.financial_space_id = $1 AND i.due_date >= $2::date AND i.due_date < $3::date
         ) due
         WHERE total_minor > paid_minor
         ORDER BY due_date, card_name, id`,
        [financialSpaceId, range.start, range.endExclusive],
      );
      return rows.map((row): DueInvoice => ({ ...toInvoice(row), cardName: row.card_name }));
    },

    async recordPayment(payment) {
      await db.query(
        `INSERT INTO card_invoice_payment
           (id, invoice_id, financial_space_id, amount_minor, currency, paid_on, recorded_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          payment.id,
          payment.invoiceId,
          payment.financialSpaceId,
          String(payment.amountMinor),
          payment.currency,
          payment.paidOn,
          payment.recordedByUserId,
        ],
      );
    },

    async listPayments(financialSpaceId, invoiceId) {
      const { rows } = await db.query<PaymentRow>(
        `SELECT ${PAYMENT_COLUMNS} FROM card_invoice_payment
         WHERE financial_space_id = $1 AND invoice_id = $2 AND deleted_at IS NULL
         ORDER BY paid_on, recorded_at, id`,
        [financialSpaceId, invoiceId],
      );
      return rows.map(toPayment);
    },

    async deletePayment(financialSpaceId, invoiceId, paymentId, actorUserId) {
      const { rows } = await db.query<PaymentRow>(
        `UPDATE card_invoice_payment SET deleted_at = now(), deleted_by_user_id = $4
         WHERE financial_space_id = $1 AND invoice_id = $2 AND id = $3 AND deleted_at IS NULL
         RETURNING ${PAYMENT_COLUMNS}`,
        [financialSpaceId, invoiceId, paymentId, actorUserId],
      );
      const [row] = rows;
      return row === undefined ? null : toPayment(row);
    },

    async listForCard(financialSpaceId, cardId, range) {
      const { rows } = await db.query<CardInvoiceRow>(
        `SELECT ${INVOICE_COLUMNS} FROM ${INVOICE_FROM}
         WHERE i.financial_space_id = $1 AND i.card_id = $2
           AND i.reference_month >= $3::date AND i.reference_month < $4::date
         ORDER BY i.reference_month`,
        [financialSpaceId, cardId, range.start, range.endExclusive],
      );
      return rows.map(toInvoice);
    },
  };
}
