CREATE TABLE financial_space (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80 AND name = btrim(name)),
  owner_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  lifecycle_state text NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX financial_space_owner_user_id_idx ON financial_space (owner_user_id, created_at);
