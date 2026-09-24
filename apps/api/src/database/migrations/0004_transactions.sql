ALTER TABLE category ADD CONSTRAINT category_id_parent_unique UNIQUE (id, parent_category_id);

CREATE TABLE financial_transaction (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  status text NOT NULL CHECK (status IN ('paid', 'pending')),
  description text NOT NULL
    CHECK (char_length(description) BETWEEN 1 AND 140 AND description = btrim(description)),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  financial_date date NOT NULL,
  category_id uuid NOT NULL,
  subcategory_id uuid,
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_transaction_category_matches_space_and_type
    FOREIGN KEY (category_id, financial_space_id, type)
    REFERENCES category (id, financial_space_id, kind) ON DELETE RESTRICT,
  CONSTRAINT financial_transaction_subcategory_belongs_to_category
    FOREIGN KEY (subcategory_id, category_id)
    REFERENCES category (id, parent_category_id) ON DELETE RESTRICT
);

CREATE INDEX financial_transaction_space_date_idx
  ON financial_transaction (financial_space_id, financial_date DESC, created_at DESC);

CREATE FUNCTION financial_transaction_category_is_top_level() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM category WHERE id = NEW.category_id AND parent_category_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Transaction category must be a top-level category'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER financial_transaction_category_is_top_level
  BEFORE INSERT OR UPDATE OF category_id ON financial_transaction
  FOR EACH ROW EXECUTE FUNCTION financial_transaction_category_is_top_level();
