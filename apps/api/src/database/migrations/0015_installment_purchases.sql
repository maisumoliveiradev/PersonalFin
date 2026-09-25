CREATE TABLE card_installment_purchase (
  id uuid PRIMARY KEY,
  financial_space_id uuid NOT NULL,
  card_id uuid NOT NULL,
  description text NOT NULL
    CHECK (char_length(description) BETWEEN 1 AND 140 AND description = btrim(description)),
  total_minor bigint NOT NULL CHECK (total_minor > 0 AND total_minor <= 99999999999),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  installment_count smallint NOT NULL CHECK (installment_count BETWEEN 2 AND 48),
  purchase_date date NOT NULL,
  first_invoice_month date NOT NULL CHECK (extract(day FROM first_invoice_month) = 1),
  created_by_user_id uuid NOT NULL REFERENCES "user" (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT card_installment_purchase_total_covers_count CHECK (total_minor >= installment_count),
  CONSTRAINT card_installment_purchase_card_in_same_space
    FOREIGN KEY (card_id, financial_space_id)
    REFERENCES card (id, financial_space_id) ON DELETE RESTRICT,
  CONSTRAINT card_installment_purchase_identity_unique UNIQUE (id, financial_space_id)
);

ALTER TABLE financial_transaction
  ADD COLUMN installment_purchase_id uuid,
  ADD COLUMN installment_number smallint CHECK (installment_number BETWEEN 1 AND 48),
  ADD CONSTRAINT financial_transaction_installment_is_complete
    CHECK ((installment_purchase_id IS NULL) = (installment_number IS NULL)),
  ADD CONSTRAINT financial_transaction_installment_is_card_purchase
    CHECK (installment_purchase_id IS NULL OR card_invoice_id IS NOT NULL),
  ADD CONSTRAINT financial_transaction_installment_in_same_space
    FOREIGN KEY (installment_purchase_id, financial_space_id)
    REFERENCES card_installment_purchase (id, financial_space_id) ON DELETE RESTRICT,
  ADD CONSTRAINT financial_transaction_installment_unique
    UNIQUE (installment_purchase_id, installment_number);
