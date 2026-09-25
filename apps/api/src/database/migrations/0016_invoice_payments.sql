CREATE TABLE card_invoice_payment (
  id uuid PRIMARY KEY,
  invoice_id uuid NOT NULL,
  financial_space_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  paid_on date NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  deleted_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  CONSTRAINT card_invoice_payment_deletion_is_complete
    CHECK ((deleted_at IS NULL) = (deleted_by_user_id IS NULL)),
  CONSTRAINT card_invoice_payment_invoice_in_same_space
    FOREIGN KEY (invoice_id, financial_space_id)
    REFERENCES card_invoice (id, financial_space_id) ON DELETE RESTRICT
);

CREATE INDEX card_invoice_payment_invoice_idx ON card_invoice_payment (invoice_id);
CREATE INDEX card_invoice_payment_space_date_idx ON card_invoice_payment (financial_space_id, paid_on);

CREATE VIEW card_invoice_balance AS
SELECT
  i.id AS invoice_id,
  COALESCE((
    SELECT SUM(t.amount_minor) FROM financial_transaction t
    WHERE t.card_invoice_id = i.id AND t.deleted_at IS NULL
  ), 0) AS total_minor,
  COALESCE((
    SELECT SUM(p.amount_minor) FROM card_invoice_payment p
    WHERE p.invoice_id = i.id AND p.deleted_at IS NULL
  ), 0) AS paid_minor
FROM card_invoice i;

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment'
  ));
