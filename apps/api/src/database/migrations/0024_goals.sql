CREATE TABLE goal (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  financial_space_id uuid REFERENCES financial_space (id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60 AND name = btrim(name)),
  target_amount_minor bigint NOT NULL
    CHECK (target_amount_minor > 0 AND target_amount_minor <= 99999999999),
  accumulated_minor bigint NOT NULL DEFAULT 0
    CHECK (accumulated_minor >= 0 AND accumulated_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  target_date date,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1)
);

CREATE INDEX goal_space_idx ON goal (financial_space_id, created_at)
  WHERE financial_space_id IS NOT NULL;
CREATE INDEX goal_global_owner_idx ON goal (owner_user_id, created_at)
  WHERE financial_space_id IS NULL;

CREATE TABLE goal_progress (
  id uuid PRIMARY KEY,
  goal_id uuid NOT NULL REFERENCES goal (id) ON DELETE RESTRICT,
  accumulated_minor bigint NOT NULL
    CHECK (accumulated_minor >= 0 AND accumulated_minor <= 99999999999),
  recorded_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX goal_progress_goal_idx ON goal_progress (goal_id, recorded_at);

CREATE FUNCTION goal_progress_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'goal_progress is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goal_progress_is_append_only
  BEFORE UPDATE OR DELETE ON goal_progress
  FOR EACH ROW EXECUTE FUNCTION goal_progress_is_append_only();

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag', 'financial_space', 'financial_space_member',
    'space_invitation', 'debt', 'debt_payment', 'goal'
  ));
