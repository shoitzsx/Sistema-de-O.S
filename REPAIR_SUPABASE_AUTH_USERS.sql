-- Remove usuarios quebrados do schema auth e prepara a recriacao correta via Admin API.
-- Execute este script no SQL Editor do Supabase.

UPDATE public.users
SET auth_email = lower(regexp_replace(trim(username), '[^a-zA-Z0-9._-]', '-', 'g')) || '@aguia.local'
WHERE auth_email IS NULL OR btrim(auth_email) = '';

DELETE FROM auth.identities ai
USING public.users pu
WHERE ai.user_id = pu.auth_user_id
   OR lower(coalesce(ai.email, '')) = lower(pu.auth_email);

DELETE FROM auth.users au
USING public.users pu
WHERE au.id = pu.auth_user_id
   OR lower(coalesce(au.email, '')) = lower(pu.auth_email);

UPDATE public.users
SET auth_user_id = NULL,
    password = 'managed-by-supabase-auth';

SELECT id, username, name, role, auth_email, auth_user_id
FROM public.users
ORDER BY id;