-- Redefine as senhas de todos os usuarios migrados para Supabase Auth.
-- Admins: 12345
-- Operadores: 1234

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  missing_auth_users INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO missing_auth_users
  FROM public.users
  WHERE auth_user_id IS NULL;

  IF missing_auth_users > 0 THEN
    RAISE EXCEPTION 'Existem % usuarios sem auth_user_id em public.users. Corrija a migracao antes de redefinir as senhas.', missing_auth_users;
  END IF;
END $$;

UPDATE auth.users AS au
SET encrypted_password = crypt(
      CASE
        WHEN lower(coalesce(pu.role, '')) IN ('admin', 'administrador') THEN '12345'
        ELSE '1234'
      END,
      gen_salt('bf')
    ),
    email_confirmed_at = COALESCE(au.email_confirmed_at, NOW()),
    updated_at = NOW(),
    raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'username', pu.username,
      'name', pu.name,
      'public_user_id', pu.id,
      'role', pu.role
    ),
    raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb)
FROM public.users AS pu
WHERE pu.auth_user_id = au.id;

SELECT
  pu.id,
  pu.username,
  pu.name,
  pu.role,
  CASE
    WHEN lower(coalesce(pu.role, '')) IN ('admin', 'administrador') THEN '12345'
    ELSE '1234'
  END AS nova_senha
FROM public.users AS pu
ORDER BY pu.id;