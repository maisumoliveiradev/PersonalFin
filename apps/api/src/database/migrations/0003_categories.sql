ALTER TABLE financial_space ADD COLUMN default_categories_seeded_at timestamptz;

CREATE TABLE category (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL REFERENCES financial_space (id) ON DELETE RESTRICT,
  parent_category_id uuid,
  kind text NOT NULL CHECK (kind IN ('expense', 'income')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60 AND name = btrim(name)),
  position integer NOT NULL CHECK (position >= 0),
  default_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_identity_unique UNIQUE (id, financial_space_id, kind),
  CONSTRAINT category_parent_same_space_and_kind
    FOREIGN KEY (parent_category_id, financial_space_id, kind)
    REFERENCES category (id, financial_space_id, kind) ON DELETE RESTRICT,
  CONSTRAINT category_default_key_unique UNIQUE (financial_space_id, default_key),
  CONSTRAINT category_sibling_name_unique
    UNIQUE NULLS NOT DISTINCT (financial_space_id, kind, parent_category_id, name)
);

CREATE INDEX category_financial_space_id_idx ON category (financial_space_id, position);

CREATE FUNCTION category_enforce_two_levels() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_category_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM category WHERE id = NEW.parent_category_id AND parent_category_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A subcategory cannot have subcategories' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_enforce_two_levels
  BEFORE INSERT OR UPDATE OF parent_category_id ON category
  FOR EACH ROW EXECUTE FUNCTION category_enforce_two_levels();
