CREATE TABLE financial_space_member (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  permissions text[] NOT NULL CHECK (
    'view' = ANY (permissions)
    AND permissions <@ ARRAY['view', 'record', 'plan', 'classify', 'manage_members', 'view_audit']
  ),
  added_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  removed_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  CONSTRAINT financial_space_member_removal_is_complete
    CHECK ((removed_at IS NULL) = (removed_by_user_id IS NULL))
);

CREATE UNIQUE INDEX financial_space_member_active_unique
  ON financial_space_member (financial_space_id, user_id) WHERE removed_at IS NULL;
CREATE INDEX financial_space_member_user_idx
  ON financial_space_member (user_id) WHERE removed_at IS NULL;

CREATE FUNCTION financial_space_member_is_not_owner() RETURNS trigger AS $$
BEGIN
  IF NEW.removed_at IS NULL AND EXISTS (
    SELECT 1 FROM financial_space
    WHERE id = NEW.financial_space_id AND owner_user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'The owner is not a member of their own space'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER financial_space_member_is_not_owner
  BEFORE INSERT OR UPDATE ON financial_space_member
  FOR EACH ROW EXECUTE FUNCTION financial_space_member_is_not_owner();

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag', 'financial_space', 'financial_space_member',
    'space_invitation'
  ));
