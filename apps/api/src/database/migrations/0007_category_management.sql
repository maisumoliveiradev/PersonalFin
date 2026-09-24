ALTER TABLE category
  ADD COLUMN archived_at timestamptz,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version >= 1);

ALTER TABLE audit_event DROP CONSTRAINT audit_event_entity_type_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_entity_type_check
  CHECK (entity_type IN ('financial_transaction', 'category'));

ALTER TABLE audit_event DROP CONSTRAINT audit_event_action_check;
ALTER TABLE audit_event
  ADD CONSTRAINT audit_event_action_check
  CHECK (action IN ('create', 'update', 'delete', 'restore'));
