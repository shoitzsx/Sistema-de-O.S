-- ============================================
-- FIX: USERS WRITE POLICIES (INSERT/UPDATE/DELETE)
-- ============================================
-- Causa do erro 401 ao criar usuário:
-- RLS habilitado na tabela users sem policy de escrita para role anon/authenticated.

alter table public.users enable row level security;

-- INSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Allow public insert users'
  ) THEN
    CREATE POLICY "Allow public insert users"
      ON public.users
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Allow public update users'
  ) THEN
    CREATE POLICY "Allow public update users"
      ON public.users
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Allow public delete users'
  ) THEN
    CREATE POLICY "Allow public delete users"
      ON public.users
      FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Opcional: grants explícitos (normalmente já existem no Supabase)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.users to anon, authenticated;
grant usage, select on sequence public.users_id_seq to anon, authenticated;
