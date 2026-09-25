CREATE TABLE attachment (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL,
  transaction_id uuid NOT NULL,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  content_type text NOT NULL
    CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 5242880),
  sha256 char(64) NOT NULL,
  content bytea NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  CONSTRAINT attachment_transaction_in_same_space
    FOREIGN KEY (transaction_id, financial_space_id)
    REFERENCES financial_transaction (id, financial_space_id) ON DELETE RESTRICT,
  CONSTRAINT attachment_deletion_consistent
    CHECK ((deleted_at IS NULL) = (deleted_by_user_id IS NULL))
);

CREATE INDEX attachment_transaction_idx
  ON attachment (transaction_id, created_at) WHERE deleted_at IS NULL;

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag', 'financial_space', 'financial_space_member',
    'space_invitation', 'debt', 'debt_payment', 'goal', 'import_batch', 'attachment'
  ));
