export const METRIC_DATE = 'COALESCE(i.reference_month, t.financial_date)';

export const EFFECTIVE_STATUS = `CASE
    WHEN t.card_invoice_id IS NULL THEN t.status
    WHEN b.total_minor > 0 AND b.paid_minor >= b.total_minor THEN 'paid'
    ELSE 'pending'
  END`;

export const METRIC_JOINS = `LEFT JOIN card_invoice i ON i.id = t.card_invoice_id
         LEFT JOIN card_invoice_balance b ON b.invoice_id = t.card_invoice_id`;
