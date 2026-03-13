-- ============================================
-- RESET COMPLETO DE RLS DA TABELA users
-- Use este script quando a criação/edição de usuários retornar 401.
-- ============================================

-- 1) Garantir schema/table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Tabela public.users não encontrada';
  END IF;
END $$;

-- 2) Remover TODAS as policies existentes da tabela users
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users;', p.policyname);
  END LOOP;
END $$;

-- 3) Reabilitar RLS e recriar policies abertas para anon/authenticated
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read users"
  ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert users"
  ON public.users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update users"
  ON public.users
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete users"
  ON public.users
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 4) Grants explícitos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO anon, authenticated;

-- 5) Verificação rápida
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;
