ALTER TABLE financial_transaction
  ADD COLUMN original_amount_minor bigint
    CHECK (original_amount_minor IS NULL OR (original_amount_minor > 0 AND original_amount_minor <= 99999999999)),
  ADD COLUMN original_currency char(3) CHECK (original_currency IS NULL OR original_currency ~ '^[A-Z]{3}$'),
  ADD COLUMN fx_rate numeric(19, 10) CHECK (fx_rate IS NULL OR fx_rate > 0),
  ADD COLUMN fx_rate_source text CHECK (fx_rate_source IS NULL OR fx_rate_source IN ('manual', 'provider')),
  ADD CONSTRAINT financial_transaction_original_amount_complete CHECK (
    (original_amount_minor IS NULL AND original_currency IS NULL AND fx_rate IS NULL AND fx_rate_source IS NULL)
    OR (original_amount_minor IS NOT NULL AND original_currency IS NOT NULL AND fx_rate IS NOT NULL
        AND fx_rate_source IS NOT NULL AND original_currency <> currency)
  );

CREATE TABLE exchange_rate (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  base_currency char(3) NOT NULL CHECK (base_currency ~ '^[A-Z]{3}$' AND base_currency <> currency),
  rate_date date NOT NULL,
  rate numeric(19, 10) NOT NULL CHECK (rate > 0),
  source text NOT NULL CHECK (source IN ('manual', 'provider')),
  recorded_by_user_id uuid REFERENCES "user" (id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX exchange_rate_lookup_idx
  ON exchange_rate (financial_space_id, currency, rate_date DESC, recorded_at DESC);

CREATE FUNCTION exchange_rate_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'exchange_rate is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_rate_is_append_only
  BEFORE UPDATE OR DELETE ON exchange_rate
  FOR EACH ROW EXECUTE FUNCTION exchange_rate_is_append_only();
