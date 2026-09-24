CREATE TABLE card (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60 AND name = btrim(name)),
  closing_day smallint NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day smallint NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  archived_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT card_identity_unique UNIQUE (id, financial_space_id)
);

CREATE UNIQUE INDEX card_name_unique ON card (financial_space_id, lower(name));

CREATE TABLE card_limit_change (
  id uuid PRIMARY KEY,
  card_id uuid NOT NULL,
  financial_space_id uuid NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  effective_from date NOT NULL,
  recorded_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT card_limit_change_card_in_same_space
    FOREIGN KEY (card_id, financial_space_id)
    REFERENCES card (id, financial_space_id) ON DELETE RESTRICT
);

CREATE INDEX card_limit_change_card_idx
  ON card_limit_change (card_id, effective_from DESC, recorded_at DESC);

CREATE FUNCTION card_limit_change_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'card_limit_change is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_limit_change_is_append_only
  BEFORE UPDATE OR DELETE ON card_limit_change
  FOR EACH ROW EXECUTE FUNCTION card_limit_change_is_append_only();

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN ('financial_transaction', 'category', 'recurrence_series', 'card'));
