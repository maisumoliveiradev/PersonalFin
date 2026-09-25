CREATE TABLE debt (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60 AND name = btrim(name)),
  original_amount_minor bigint NOT NULL
    CHECK (original_amount_minor > 0 AND original_amount_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  installment_count integer NOT NULL CHECK (installment_count BETWEEN 1 AND 600),
  installment_amount_minor bigint NOT NULL
    CHECK (installment_amount_minor > 0 AND installment_amount_minor <= original_amount_minor),
  first_due_date date NOT NULL,
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT debt_identity_unique UNIQUE (id, financial_space_id)
);

CREATE INDEX debt_space_idx ON debt (financial_space_id, created_at);

CREATE TABLE debt_payment (
  id uuid PRIMARY KEY,
  debt_id uuid NOT NULL,
  financial_space_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('installment', 'prepayment')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999),
  paid_on date NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  deleted_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  CONSTRAINT debt_payment_debt_in_same_space
    FOREIGN KEY (debt_id, financial_space_id)
    REFERENCES debt (id, financial_space_id) ON DELETE RESTRICT,
  CONSTRAINT debt_payment_deletion_consistent
    CHECK ((deleted_at IS NULL) = (deleted_by_user_id IS NULL))
);

CREATE INDEX debt_payment_debt_idx ON debt_payment (debt_id, paid_on, recorded_at);

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag', 'financial_space', 'financial_space_member',
    'space_invitation', 'debt', 'debt_payment'
  ));
