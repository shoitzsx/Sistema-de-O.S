-- Migra o login legado da tabela public.users para Supabase Auth
-- e refaz as policies com base em auth.uid().
-- Execute este script apos:
-- schema.sql
-- ADD_AUDIT_LOGS_TABLE.sql
-- ADD_USER_NOTIFICATIONS_TABLE.sql
-- ADD_SERVICE_ORDER_ASSIGNMENT_COLUMNS.sql
-- ADD_CHECKLIST_SCHEDULES_TABLE.sql
-- ADD_MAINTENANCE_LIFECYCLE_COLUMNS.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS auth_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users (auth_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_email ON public.users (auth_email);

UPDATE public.users
SET auth_email = lower(regexp_replace(trim(username), '[^a-zA-Z0-9._-]', '-', 'g')) || '@aguia.local'
WHERE auth_email IS NULL OR btrim(auth_email) = '';

UPDATE public.users AS pu
SET auth_user_id = au.id
FROM auth.users AS au
WHERE lower(au.email) = lower(pu.auth_email)
  AND pu.auth_user_id IS NULL;

DO $$
DECLARE
  user_row RECORD;
  generated_auth_id UUID;
BEGIN
  FOR user_row IN
    SELECT id, username, auth_email, password, name, role
    FROM public.users
    WHERE auth_user_id IS NULL
  LOOP
    generated_auth_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      generated_auth_id,
      'authenticated',
      'authenticated',
      user_row.auth_email,
      crypt(COALESCE(NULLIF(user_row.password, ''), 'admin123'), gen_salt('bf')),
      now(),
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('username', user_row.username, 'name', user_row.name, 'public_user_id', user_row.id, 'role', user_row.role),
      now(),
      now()
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      generated_auth_id,
      jsonb_build_object('sub', generated_auth_id::text, 'email', user_row.auth_email),
      'email',
      generated_auth_id::text,
      now(),
      now(),
      now()
    );

    UPDATE public.users
    SET auth_user_id = generated_auth_id,
        password = 'managed-by-supabase-auth',
        auth_email = user_row.auth_email
    WHERE id = user_row.id;
  END LOOP;
END $$;

ALTER TABLE public.users
  ALTER COLUMN auth_email SET NOT NULL;

CREATE OR REPLACE VIEW public.login_directory AS
SELECT id, name, username, role
FROM public.users
ORDER BY name;

GRANT SELECT ON public.login_directory TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
      AND lower(role) IN ('admin', 'administrador')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated;

DO $$
DECLARE
  policy_row RECORD;
  managed_tables TEXT[] := ARRAY[
    'users',
    'machines',
    'parts_tools',
    'service_orders',
    'checklists',
    'checklist_templates',
    'checklist_schedules',
    'user_notifications',
    'audit_logs'
  ];
  current_table TEXT;
BEGIN
  FOREACH current_table IN ARRAY managed_tables
  LOOP
    FOR policy_row IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = current_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_row.policyname, current_table);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notifications'
  ) THEN
    ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

CREATE POLICY "Users can read own profile or admins read all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user() OR auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile or admins update all"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user() OR auth_user_id = auth.uid())
  WITH CHECK (public.is_admin_user() OR auth_user_id = auth.uid());

CREATE POLICY "Authenticated users can read machines"
  ON public.machines
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage machines"
  ON public.machines
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Authenticated users can read parts tools"
  ON public.parts_tools
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage parts tools"
  ON public.parts_tools
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Authenticated users can read checklist templates"
  ON public.checklist_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage checklist templates"
  ON public.checklist_templates
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Users read related service orders"
  ON public.service_orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
    OR COALESCE(assigned_user_id, -1) = public.current_app_user_id()
  );

CREATE POLICY "Users insert own service orders"
  ON public.service_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  );

CREATE POLICY "Users update related service orders"
  ON public.service_orders
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
    OR COALESCE(assigned_user_id, -1) = public.current_app_user_id()
  )
  WITH CHECK (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
    OR COALESCE(assigned_user_id, -1) = public.current_app_user_id()
  );

CREATE POLICY "Admins delete service orders"
  ON public.service_orders
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Users read own checklists"
  ON public.checklists
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  );

CREATE POLICY "Users insert own checklists"
  ON public.checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  );

CREATE POLICY "Users update own checklists"
  ON public.checklists
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  )
  WITH CHECK (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  );

CREATE POLICY "Users read related checklist schedules"
  ON public.checklist_schedules
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  );

CREATE POLICY "Admins insert checklist schedules"
  ON public.checklist_schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins and assigned operators update checklist schedules"
  ON public.checklist_schedules
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  )
  WITH CHECK (
    public.is_admin_user()
    OR operator_id = public.current_app_user_id()
  );

CREATE POLICY "Admins delete checklist schedules"
  ON public.checklist_schedules
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notifications'
  ) THEN
    EXECUTE '
      CREATE POLICY "Users read own notifications"
        ON public.user_notifications
        FOR SELECT
        TO authenticated
        USING (public.is_admin_user() OR user_id = public.current_app_user_id())';

    EXECUTE '
      CREATE POLICY "Users update own notifications"
        ON public.user_notifications
        FOR UPDATE
        TO authenticated
        USING (public.is_admin_user() OR user_id = public.current_app_user_id())
        WITH CHECK (public.is_admin_user() OR user_id = public.current_app_user_id())';

    EXECUTE '
      CREATE POLICY "Users delete own notifications"
        ON public.user_notifications
        FOR DELETE
        TO authenticated
        USING (public.is_admin_user() OR user_id = public.current_app_user_id())';

    EXECUTE '
      CREATE POLICY "Authenticated users insert notifications"
        ON public.user_notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (public.is_admin_user() OR user_id = public.current_app_user_id())';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    EXECUTE '
      CREATE POLICY "Authenticated users insert audit logs"
        ON public.audit_logs
        FOR INSERT
        TO authenticated
        WITH CHECK (true)';

    EXECUTE '
      CREATE POLICY "Admins read audit logs"
        ON public.audit_logs
        FOR SELECT
        TO authenticated
        USING (public.is_admin_user())';
  END IF;
END $$;