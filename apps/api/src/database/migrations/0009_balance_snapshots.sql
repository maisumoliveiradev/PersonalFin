CREATE TABLE balance_snapshot (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (abs(amount_minor) <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  observed_on date NOT NULL,
  note text CHECK (note IS NULL OR (char_length(note) BETWEEN 1 AND 140 AND note = btrim(note))),
  recorded_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX balance_snapshot_current_idx
  ON balance_snapshot (financial_space_id, observed_on DESC, recorded_at DESC, id DESC);

CREATE FUNCTION balance_snapshot_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'balance_snapshot is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER balance_snapshot_is_append_only
  BEFORE UPDATE OR DELETE ON balance_snapshot
  FOR EACH ROW EXECUTE FUNCTION balance_snapshot_is_append_only();
