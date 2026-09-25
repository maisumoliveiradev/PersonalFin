CREATE TABLE space_invitation (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 254),
  permissions text[] NOT NULL CHECK (
    'view' = ANY (permissions)
    AND permissions <@ ARRAY['view', 'record', 'plan', 'classify', 'manage_members', 'view_audit']
  ),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  cancelled_at timestamptz,
  cancelled_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  CONSTRAINT space_invitation_acceptance_is_complete
    CHECK ((accepted_at IS NULL) = (accepted_by_user_id IS NULL)),
  CONSTRAINT space_invitation_cancellation_is_complete
    CHECK ((cancelled_at IS NULL) = (cancelled_by_user_id IS NULL)),
  CONSTRAINT space_invitation_single_outcome
    CHECK (accepted_at IS NULL OR cancelled_at IS NULL)
);

CREATE INDEX space_invitation_space_idx ON space_invitation (financial_space_id, created_at);
