CREATE TABLE balance_reminder_setting (
  user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE CASCADE,
  frequency text NOT NULL CHECK (frequency IN ('app_start', 'daily', 'every_n_days', 'never')),
  interval_days integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, financial_space_id),
  CONSTRAINT balance_reminder_interval_matches_frequency CHECK (
    (frequency = 'every_n_days' AND interval_days BETWEEN 1 AND 90)
    OR (frequency <> 'every_n_days' AND interval_days IS NULL)
  )
);
