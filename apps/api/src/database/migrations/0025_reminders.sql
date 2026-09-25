CREATE TABLE reminder_setting (
  user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE CASCADE,
  offsets smallint[] NOT NULL CHECK (offsets <@ ARRAY[0, 1, 3, 7]::smallint[]),
  kinds text[] NOT NULL
    CHECK (kinds <@ ARRAY['transactions', 'invoices', 'debts', 'projection']::text[]),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, financial_space_id)
);

CREATE TABLE reminder_dismissal (
  user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE CASCADE,
  reminder_key text NOT NULL CHECK (char_length(reminder_key) BETWEEN 1 AND 200),
  stage text NOT NULL CHECK (stage IN ('overdue', 'before-0', 'before-1', 'before-3', 'before-7')),
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, financial_space_id, reminder_key, stage)
);
