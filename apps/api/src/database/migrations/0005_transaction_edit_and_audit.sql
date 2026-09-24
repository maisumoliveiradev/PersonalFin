ALTER TABLE financial_transaction
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  ADD COLUMN updated_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT;

CREATE TABLE audit_event (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK (entity_type IN ('financial_transaction')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('update')),
  actor_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL CHECK (jsonb_typeof(changes) = 'object')
);

CREATE INDEX audit_event_entity_idx
  ON audit_event (financial_space_id, entity_type, entity_id, occurred_at);

CREATE FUNCTION audit_event_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_is_append_only
  BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION audit_event_is_append_only();
