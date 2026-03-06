-- ============================================
-- FIX RLS POLICIES PARA PERMITIR LOGIN
-- ============================================

-- Habilitar RLS na tabela users (se ainda não estiver)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Allow public read" ON users;
DROP POLICY IF EXISTS "Users can read their own data" ON users;

-- Criar política que permite leitura pública (necessário para login)
CREATE POLICY "Allow public read" ON users
FOR SELECT USING (true);

-- Criar política que permite usuários atualizarem seus próprios dados
CREATE POLICY "Users can update their own data" ON users
FOR UPDATE USING (auth.uid()::bigint = id)
WITH CHECK (auth.uid()::bigint = id);

-- ===== APLICAR MESMA POLÍTICA PARA AS OUTRAS TABELAS =====

-- Machines
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON machines;
CREATE POLICY "Allow public read" ON machines
FOR SELECT USING (true);

-- Parts/Tools
ALTER TABLE parts_tools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON parts_tools;
CREATE POLICY "Allow public read" ON parts_tools
FOR SELECT USING (true);

-- Service Orders
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON service_orders;
CREATE POLICY "Allow public read" ON service_orders
FOR SELECT USING (true);

-- Checklists
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON checklists;
CREATE POLICY "Allow public read" ON checklists
FOR SELECT USING (true);

-- Checklist Templates
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON checklist_templates;
CREATE POLICY "Allow public read" ON checklist_templates
FOR SELECT USING (true);
