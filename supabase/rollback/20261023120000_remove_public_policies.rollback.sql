-- Reverte 20261023120000_remove_public_policies.sql, recriando o estado
-- observado em 2026-10-23. Use só em emergência: o estado anterior deixa
-- machines, audit_logs e os arquivos abertos para qualquer pessoa.

drop policy if exists "Users read audit logs of visible service orders" on public.audit_logs;
drop policy if exists "Authenticated users insert own audit logs"       on public.audit_logs;
drop policy if exists "Authenticated read machine and manual files"      on storage.objects;
drop policy if exists "Admins upload machine and manual files"           on storage.objects;
drop policy if exists "Admins update machine and manual files"           on storage.objects;
drop policy if exists "Admins delete machine and manual files"           on storage.objects;

create policy "Allow public read machines table"   on public.machines for select using (true);
create policy "Allow public insert machines table" on public.machines for insert with check (true);
create policy "Allow public update machines table" on public.machines for update using (true) with check (true);
create policy "Allow public delete machines table" on public.machines for delete using (true);

create policy "Allow public read audit logs"          on public.audit_logs for select using (true);
create policy "Allow public insert audit logs"        on public.audit_logs for insert with check (true);
create policy "Authenticated users insert audit logs" on public.audit_logs for insert to authenticated with check (true);

create policy "Allow public read machines bucket"   on storage.objects for select using (bucket_id = 'machines');
create policy "Allow public upload machines bucket" on storage.objects for insert with check (bucket_id = 'machines');
create policy "Allow public update machines bucket" on storage.objects for update using (bucket_id = 'machines') with check (bucket_id = 'machines');
create policy "Allow public delete machines bucket" on storage.objects for delete using (bucket_id = 'machines');
create policy "Allow public read manuals bucket"    on storage.objects for select using (bucket_id = 'manuals');
create policy "Allow public upload manuals bucket"  on storage.objects for insert with check (bucket_id = 'manuals');
create policy "Allow public update manuals bucket"  on storage.objects for update using (bucket_id = 'manuals') with check (bucket_id = 'manuals');
create policy "Allow public delete manuals bucket"  on storage.objects for delete using (bucket_id = 'manuals');

grant all on table
  public.users, public.machines, public.parts_tools, public.service_orders,
  public.checklists, public.checklist_templates, public.checklist_schedules,
  public.audit_logs, public.role_permissions, public.user_permissions
to anon;

grant execute on function public.is_admin_user()       to anon;
grant execute on function public.current_app_user_id() to anon;
grant execute on function public.rls_auto_enable()     to anon, authenticated;
