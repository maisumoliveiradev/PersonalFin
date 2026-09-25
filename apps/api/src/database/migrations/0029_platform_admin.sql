CREATE TABLE platform_admin (
  user_id uuid PRIMARY KEY REFERENCES "user" (id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by text NOT NULL CHECK (char_length(granted_by) BETWEEN 1 AND 200)
);
