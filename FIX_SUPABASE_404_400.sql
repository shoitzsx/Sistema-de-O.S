-- Execute este script no SQL Editor do Supabase para corrigir:
-- 1) 404 em /rest/v1/audit_logs (tabela inexistente)
-- 2) 400 Bucket not found no upload de manuais/imagens

-- =====================================================
-- AUDIT LOGS TABLE + POLICIES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
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

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Allow public insert audit logs'
  ) THEN
    CREATE POLICY "Allow public insert audit logs"
      ON public.audit_logs
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Allow public read audit logs'
  ) THEN
    CREATE POLICY "Allow public read audit logs"
      ON public.audit_logs
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- =====================================================
-- STORAGE BUCKET (machines) + POLICIES
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('machines', 'machines', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read machines bucket'
  ) THEN
    CREATE POLICY "Allow public read machines bucket"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'machines');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public upload machines bucket'
  ) THEN
    CREATE POLICY "Allow public upload machines bucket"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'machines');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public update machines bucket'
  ) THEN
    CREATE POLICY "Allow public update machines bucket"
      ON storage.objects
      FOR UPDATE
      USING (bucket_id = 'machines')
      WITH CHECK (bucket_id = 'machines');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public delete machines bucket'
  ) THEN
    CREATE POLICY "Allow public delete machines bucket"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'machines');
  END IF;
END $$;
