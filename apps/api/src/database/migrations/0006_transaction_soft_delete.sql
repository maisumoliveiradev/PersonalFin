ALTER TABLE financial_transaction
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  ADD CONSTRAINT financial_transaction_deletion_is_complete
    CHECK ((deleted_at IS NULL) = (deleted_by_user_id IS NULL));

ALTER TABLE audit_event DROP CONSTRAINT audit_event_action_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_action_check CHECK (action IN ('update', 'delete', 'restore'));

CREATE INDEX financial_transaction_space_deleted_idx
  ON financial_transaction (financial_space_id, deleted_at DESC)
  WHERE deleted_at IS NOT NULL;
