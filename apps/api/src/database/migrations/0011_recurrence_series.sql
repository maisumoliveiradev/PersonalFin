CREATE TABLE recurrence_series (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  description text NOT NULL
    CHECK (char_length(description) BETWEEN 1 AND 140 AND description = btrim(description)),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  category_id uuid NOT NULL,
  subcategory_id uuid,
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'yearly')),
  non_business_day_rule text NOT NULL CHECK (non_business_day_rule IN ('keep', 'previous', 'next')),
  start_date date NOT NULL,
  end_date date CHECK (end_date IS NULL OR end_date >= start_date),
  materialized_through date,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT recurrence_series_identity_unique UNIQUE (id, financial_space_id),
  CONSTRAINT recurrence_series_category_matches_space_and_type
    FOREIGN KEY (category_id, financial_space_id, type)
    REFERENCES category (id, financial_space_id, kind) ON DELETE RESTRICT,
  CONSTRAINT recurrence_series_subcategory_belongs_to_category
    FOREIGN KEY (subcategory_id, category_id)
    REFERENCES category (id, parent_category_id) ON DELETE RESTRICT
);

CREATE INDEX recurrence_series_space_idx ON recurrence_series (financial_space_id, created_at);

ALTER TABLE financial_transaction
  ADD COLUMN recurrence_series_id uuid,
  ADD COLUMN occurrence_date date,
  ADD CONSTRAINT financial_transaction_occurrence_is_complete
    CHECK ((recurrence_series_id IS NULL) = (occurrence_date IS NULL)),
  ADD CONSTRAINT financial_transaction_series_in_same_space
    FOREIGN KEY (recurrence_series_id, financial_space_id)
    REFERENCES recurrence_series (id, financial_space_id) ON DELETE RESTRICT,
  ADD CONSTRAINT financial_transaction_occurrence_unique
    UNIQUE (recurrence_series_id, occurrence_date);

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN ('financial_transaction', 'category', 'recurrence_series'));
