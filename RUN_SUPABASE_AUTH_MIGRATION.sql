-- Pacote de execucao unica para a migracao de autenticacao e RLS por usuario.
-- Execute os arquivos abaixo na ordem indicada no SQL Editor do Supabase.

-- 1) schema.sql
-- 2) ADD_AUDIT_LOGS_TABLE.sql
-- 3) ADD_USER_NOTIFICATIONS_TABLE.sql
-- 4) ADD_SERVICE_ORDER_ASSIGNMENT_COLUMNS.sql
-- 5) ADD_CHECKLIST_SCHEDULES_TABLE.sql
-- 6) ADD_MAINTENANCE_LIFECYCLE_COLUMNS.sql
-- 7) MIGRATE_TO_SUPABASE_AUTH.sql
-- 8) ADD_FINE_GRAINED_PERMISSIONS.sql
-- 9) FIX_SUPABASE_404_400.sql

-- Este arquivo existe como checklist operacional para reduzir erro de ordem.
-- O conteudo executavel esta mantido em arquivos separados para facilitar rollback e auditoria.