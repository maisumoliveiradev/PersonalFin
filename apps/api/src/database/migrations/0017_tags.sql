CREATE TABLE tag (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40 AND name = btrim(name)),
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT tag_identity_unique UNIQUE (id, financial_space_id)
);

CREATE UNIQUE INDEX tag_name_unique ON tag (financial_space_id, lower(name));

ALTER TABLE financial_transaction
  ADD CONSTRAINT financial_transaction_identity_unique UNIQUE (id, financial_space_id);

CREATE TABLE transaction_tag (
  transaction_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  financial_space_id uuid NOT NULL,
  PRIMARY KEY (transaction_id, tag_id),
  CONSTRAINT transaction_tag_transaction_in_space
    FOREIGN KEY (transaction_id, financial_space_id)
    REFERENCES financial_transaction (id, financial_space_id) ON DELETE RESTRICT,
  CONSTRAINT transaction_tag_tag_in_space
    FOREIGN KEY (tag_id, financial_space_id)
    REFERENCES tag (id, financial_space_id) ON DELETE RESTRICT
);

CREATE INDEX transaction_tag_tag_idx ON transaction_tag (tag_id);

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag'
  ));
