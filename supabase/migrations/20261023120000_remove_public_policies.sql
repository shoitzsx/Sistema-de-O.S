-- =============================================================================
-- Remove acesso anônimo de escrita/leitura em machines, audit_logs e Storage
-- Projeto Supabase: "Águia Florestal PCM"
--
-- Estado auditado em 2026-10-23 (somente leitura, pg_policies):
--   * machines: policies "Allow public read/insert/update/delete machines table"
--     para o papel public (inclui anon), todas com true.
--   * audit_logs: "Allow public read audit logs" e "Allow public insert audit logs"
--     para public, com true.
--   * storage.objects: 8 policies "Allow public ..." (SELECT/INSERT/UPDATE/DELETE)
--     nos buckets machines e manuals.
-- Policies permissivas se somam (OR): enquanto as públicas existirem, as
-- policies corretas ("Admins manage machines", "Admins read audit logs")
-- não protegem nada.
--
-- Uso no app (verificado no código em 2026-10-23):
--   * Login via supabase.auth.signInWithPassword: as chamadas seguintes vão com
--     o papel authenticated.
--   * machines: escrita só em src/pages/Manuals.tsx, liberada só para admin
--     (isAdmin), mesmo critério de public.is_admin_user().
--   * audit_logs: insert só em src/lib/audit.ts (recordAuditAction), chamado
--     em páginas autenticadas, com user_id = usuário logado. Leitura em
--     ServiceOrders, History, ServiceOrderViewer e NotificationBox também por
--     operadores (ações service_order_*), por isso a leitura não fica só
--     para admin.
--   * Storage: upload (upsert: true) só em Manuals.tsx por admin; leitura dos
--     arquivos por getPublicUrl (bucket público, não depende de policy).
--   * login_directory é usada ANTES do login e NÃO é alterada aqui (exige mudar
--     o fluxo de login; ver nota no PR).
--
-- Não aplicar sem: backup, revisão e teste logado como admin e como operador.
-- Reversão: supabase/rollback/20261023120000_remove_public_policies.rollback.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. machines: ficam só "Admins manage machines" (ALL, is_admin_user()) e
--    "Authenticated users can read machines" (SELECT, authenticated).
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public read machines table"   on public.machines;
drop policy if exists "Allow public insert machines table" on public.machines;
drop policy if exists "Allow public update machines table" on public.machines;
drop policy if exists "Allow public delete machines table" on public.machines;

-- ---------------------------------------------------------------------------
-- 2. audit_logs
--    Leitura: admin vê tudo; demais usuários veem logs de OS que já podem ver
--    (a subconsulta em service_orders respeita o RLS de service_orders).
--    Escrita: só authenticated e somente em nome de si mesmo.
--    Sem UPDATE/DELETE: o log continua só de inclusão.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public read audit logs"          on public.audit_logs;
drop policy if exists "Allow public insert audit logs"        on public.audit_logs;
drop policy if exists "Authenticated users insert audit logs" on public.audit_logs;

create policy "Users read audit logs of visible service orders"
  on public.audit_logs
  for select
  to authenticated
  using (
    entity_type = 'service_orders'
    and exists (
      select 1
      from public.service_orders so
      where so.id = audit_logs.entity_id
    )
  );

create policy "Authenticated users insert own audit logs"
  on public.audit_logs
  for insert
  to authenticated
  with check (user_id = public.current_app_user_id());

-- "Admins read audit logs" (SELECT, is_admin_user()) continua valendo.

-- ---------------------------------------------------------------------------
-- 3. Storage (buckets machines e manuals)
--    Os buckets continuam public = true: getPublicUrl segue funcionando para
--    exibir fotos e manuais. O que muda é quem lista e escreve via API.
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public read machines bucket"   on storage.objects;
drop policy if exists "Allow public upload machines bucket" on storage.objects;
drop policy if exists "Allow public update machines bucket" on storage.objects;
drop policy if exists "Allow public delete machines bucket" on storage.objects;
drop policy if exists "Allow public read manuals bucket"    on storage.objects;
drop policy if exists "Allow public upload manuals bucket"  on storage.objects;
drop policy if exists "Allow public update manuals bucket"  on storage.objects;
drop policy if exists "Allow public delete manuals bucket"  on storage.objects;

create policy "Authenticated read machine and manual files"
  on storage.objects
  for select
  to authenticated
  using (bucket_id in ('machines', 'manuals'));

create policy "Admins upload machine and manual files"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id in ('machines', 'manuals') and public.is_admin_user());

create policy "Admins update machine and manual files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id in ('machines', 'manuals') and public.is_admin_user())
  with check (bucket_id in ('machines', 'manuals') and public.is_admin_user());

create policy "Admins delete machine and manual files"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id in ('machines', 'manuals') and public.is_admin_user());

-- ---------------------------------------------------------------------------
-- 4. Defesa em profundidade: o anon não precisa de nenhuma tabela.
--    A view login_directory continua com SELECT para anon (seção fora do escopo).
-- ---------------------------------------------------------------------------
revoke all on table
  public.users,
  public.machines,
  public.parts_tools,
  public.service_orders,
  public.checklists,
  public.checklist_templates,
  public.checklist_schedules,
  public.audit_logs,
  public.role_permissions,
  public.user_permissions
from anon;

revoke execute on function public.is_admin_user()        from public, anon;
revoke execute on function public.current_app_user_id()  from public, anon;
revoke execute on function public.rls_auto_enable()      from public, anon, authenticated;

-- Verificação depois de aplicar (deve retornar 0 linhas):
--   select tablename, policyname from pg_policies
--   where 'public' = any(roles) or 'anon' = any(roles);
