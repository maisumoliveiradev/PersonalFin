CREATE TABLE card_invoice (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL,
  financial_space_id uuid NOT NULL,
  reference_month date NOT NULL CHECK (extract(day FROM reference_month) = 1),
  closing_date date NOT NULL,
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT card_invoice_closes_before_due CHECK (closing_date <= due_date),
  CONSTRAINT card_invoice_card_in_same_space
    FOREIGN KEY (card_id, financial_space_id)
    REFERENCES card (id, financial_space_id) ON DELETE RESTRICT,
  CONSTRAINT card_invoice_month_unique UNIQUE (card_id, reference_month),
  CONSTRAINT card_invoice_identity_unique UNIQUE (id, financial_space_id)
);

CREATE INDEX card_invoice_space_due_idx ON card_invoice (financial_space_id, due_date);

ALTER TABLE financial_transaction
  ADD COLUMN card_invoice_id uuid,
  ADD CONSTRAINT financial_transaction_invoice_in_same_space
    FOREIGN KEY (card_invoice_id, financial_space_id)
    REFERENCES card_invoice (id, financial_space_id) ON DELETE RESTRICT,
  ADD CONSTRAINT financial_transaction_card_purchase_is_pending_expense
    CHECK (card_invoice_id IS NULL OR (type = 'expense' AND status = 'pending')),
  ADD CONSTRAINT financial_transaction_card_purchase_is_not_recurring
    CHECK (card_invoice_id IS NULL OR recurrence_series_id IS NULL);

CREATE INDEX financial_transaction_invoice_idx
  ON financial_transaction (card_invoice_id) WHERE card_invoice_id IS NOT NULL;

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice'
  ));
