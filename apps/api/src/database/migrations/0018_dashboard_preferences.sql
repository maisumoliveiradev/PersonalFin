CREATE TABLE dashboard_preference (
  user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE CASCADE,
  profile text NOT NULL CHECK (profile IN ('basic', 'intermediate', 'advanced')),
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(overrides) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, financial_space_id)
);
