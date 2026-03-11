-- ============================================
-- FIX: Permitir DELETE em service_orders (Supabase RLS)
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- Garantir que RLS esteja habilitado
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

-- Remover policy antiga de delete, se existir
DROP POLICY IF EXISTS "Allow public delete" ON service_orders;
DROP POLICY IF EXISTS "Allow delete service_orders" ON service_orders;

-- Criar policy de DELETE
-- OBS: Este projeto faz controle de admin no frontend/localStorage.
-- Por isso, para funcionar com essa arquitetura atual, o DELETE precisa ser público.
CREATE POLICY "Allow public delete" ON service_orders
FOR DELETE
USING (true);

-- (Opcional) Conferir policies atuais da tabela
-- SELECT * FROM pg_policies WHERE tablename = 'service_orders';
