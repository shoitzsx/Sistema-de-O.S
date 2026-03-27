# Checklist de aplicacao no Supabase e Vercel

## 1. Variaveis na Vercel

Configure no projeto:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_ADMIN_API_BASE_URL`

Valor recomendado para `VITE_ADMIN_API_BASE_URL`:

- deixar vazio para usar o mesmo dominio do app

## 2. Ordem de execucao dos SQLs no Supabase

1. `schema.sql`
2. `ADD_AUDIT_LOGS_TABLE.sql`
3. `ADD_USER_NOTIFICATIONS_TABLE.sql`
4. `ADD_SERVICE_ORDER_ASSIGNMENT_COLUMNS.sql`
5. `ADD_CHECKLIST_SCHEDULES_TABLE.sql`
6. `ADD_MAINTENANCE_LIFECYCLE_COLUMNS.sql`
7. `MIGRATE_TO_SUPABASE_AUTH.sql`
8. `ADD_FINE_GRAINED_PERMISSIONS.sql`
9. `FIX_SUPABASE_404_400.sql`

## 3. Resultado esperado

- login passa a usar Supabase Auth
- `public.users` vira perfil de aplicacao vinculado a `auth.users`
- RLS passa a usar `auth.uid()` e funcoes auxiliares
- criacao, edicao e exclusao de usuarios passam pela API `/api/admin/users`

## 4. Validacao minima depois da aplicacao

1. abrir tela de login e autenticar com um usuario migrado
2. abrir dashboard e confirmar carregamento do perfil
3. criar um novo usuario pela tela de administracao
4. editar senha desse usuario
5. validar se um operador nao consegue listar usuarios
6. validar leitura restrita de O.S. e checklists do proprio escopo