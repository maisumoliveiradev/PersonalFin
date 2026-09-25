ALTER TABLE audit_event
  ADD COLUMN context jsonb NULL CHECK (context IS NULL OR jsonb_typeof(context) = 'object');
