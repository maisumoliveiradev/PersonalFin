CREATE TABLE import_batch (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  file_format text NOT NULL CHECK (file_format IN ('csv', 'xlsx')),
  file_sha256 char(64) NOT NULL,
  file_content bytea NOT NULL,
  row_count integer NOT NULL CHECK (row_count >= 0),
  mapping jsonb CHECK (mapping IS NULL OR jsonb_typeof(mapping) = 'object'),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'imported', 'undone', 'discarded')),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  undone_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT import_batch_identity_unique UNIQUE (id, financial_space_id)
);

CREATE INDEX import_batch_space_idx ON import_batch (financial_space_id, created_at DESC);

CREATE TABLE import_row (
  import_batch_id uuid NOT NULL REFERENCES import_batch (id) ON DELETE CASCADE,
  row_number integer NOT NULL CHECK (row_number >= 1),
  cells jsonb NOT NULL CHECK (jsonb_typeof(cells) = 'array'),
  parsed jsonb CHECK (parsed IS NULL OR jsonb_typeof(parsed) = 'object'),
  errors text[] NOT NULL DEFAULT '{}',
  duplicate_of jsonb CHECK (duplicate_of IS NULL OR jsonb_typeof(duplicate_of) = 'object'),
  decision text CHECK (decision IN ('import', 'skip')),
  transaction_id uuid,
  PRIMARY KEY (import_batch_id, row_number)
);

ALTER TABLE financial_transaction
  ADD COLUMN import_batch_id uuid,
  ADD CONSTRAINT financial_transaction_import_batch_in_same_space
    FOREIGN KEY (import_batch_id, financial_space_id)
    REFERENCES import_batch (id, financial_space_id) ON DELETE RESTRICT;

CREATE INDEX financial_transaction_import_batch_idx
  ON financial_transaction (import_batch_id) WHERE import_batch_id IS NOT NULL;

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag', 'financial_space', 'financial_space_member',
    'space_invitation', 'debt', 'debt_payment', 'goal', 'import_batch'
  ));
