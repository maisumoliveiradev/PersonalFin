CREATE TABLE support_grant (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  granted_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  admin_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 500 AND reason = btrim(reason)),
  scope text NOT NULL DEFAULT 'view' CHECK (scope = 'view'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  CONSTRAINT support_grant_expiry_window
    CHECK (expires_at > created_at AND expires_at <= created_at + interval '7 days'),
  CONSTRAINT support_grant_revocation_consistent
    CHECK ((revoked_at IS NULL) = (revoked_by_user_id IS NULL))
);

CREATE INDEX support_grant_admin_idx ON support_grant (admin_user_id, financial_space_id)
  WHERE revoked_at IS NULL;
CREATE INDEX support_grant_space_idx ON support_grant (financial_space_id, created_at DESC);

ALTER TABLE audit_event DROP CONSTRAINT audit_event_action_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_action_check
  CHECK (action IN ('create', 'update', 'delete', 'restore', 'access'));

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN (
    'financial_transaction', 'category', 'recurrence_series', 'card', 'card_invoice',
    'card_invoice_payment', 'tag', 'financial_space', 'financial_space_member',
    'space_invitation', 'debt', 'debt_payment', 'goal', 'import_batch', 'attachment',
    'support_grant'
  ));
