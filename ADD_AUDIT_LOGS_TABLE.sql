-- Tabela de auditoria para ações críticas de O.S
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  details JSONB DEFAULT '{}'::jsonb,
  user_id BIGINT,
  user_name TEXT,
  user_role TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Allow public insert audit logs'
  ) THEN
    CREATE POLICY "Allow public insert audit logs"
      ON audit_logs
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Allow public read audit logs'
  ) THEN
    CREATE POLICY "Allow public read audit logs"
      ON audit_logs
      FOR SELECT
      USING (true);
  END IF;
END $$;
