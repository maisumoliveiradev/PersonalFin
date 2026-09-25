CREATE INDEX audit_event_space_history_idx
  ON audit_event (financial_space_id, occurred_at DESC, id DESC);
