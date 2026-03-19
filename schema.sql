-- ============================================
-- SCHEMA PARA SUPABASE - AGUIA FLORESTAL
-- ============================================

-- 1. CRIAR TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'operator')) NOT NULL,
  allowed_modules TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CRIAR TABELA DE MÁQUINAS
CREATE TABLE IF NOT EXISTS machines (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  image_url TEXT,
  manual_url TEXT,
  description TEXT,
  quick_specs TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. CRIAR TABELA DE PEÇAS E FERRAMENTAS
CREATE TABLE IF NOT EXISTS parts_tools (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK(category IN ('part', 'tool')) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. CRIAR TABELA DE ORDENS DE SERVIÇO
CREATE TABLE IF NOT EXISTS service_orders (
  id BIGSERIAL PRIMARY KEY,
  machine_id BIGINT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  operator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  machine_name TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  assigned_user_name TEXT,
  maintenance_type TEXT DEFAULT 'corretiva',
  technician_name TEXT,
  component TEXT,
  description TEXT NOT NULL,
  tools TEXT DEFAULT '[]',
  used_parts_tools TEXT DEFAULT '[]',
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status TEXT CHECK(status IN ('open', 'closed')) DEFAULT 'open',
  final_report TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. CRIAR TABELA DE TEMPLATES DE CHECKLIST
CREATE TABLE IF NOT EXISTS checklist_templates (
  id BIGSERIAL PRIMARY KEY,
  machine_model TEXT NOT NULL UNIQUE,
  items TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. CRIAR TABELA DE CHECKLISTS
CREATE TABLE IF NOT EXISTS checklists (
  id BIGSERIAL PRIMARY KEY,
  machine_id BIGINT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  operator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'completed')) DEFAULT 'pending',
  data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SEED DATA (Dados iniciais)
-- ============================================

-- Usuários
INSERT INTO users (name, username, password, role, allowed_modules) VALUES
  ('Igor Andrade', 'admin', 'admin123', 'admin', '[1,2,3]'),
  ('João Silva', 'joao', '1234', 'operator', '[1,2]'),
  ('Maria Santos', 'maria', '1234', 'operator', '[1,3]'),
  ('Pedro Souza', 'pedro', '1234', 'operator', '[2,3]')
ON CONFLICT (username) DO NOTHING;

-- Máquinas
INSERT INTO machines (name, model, image_url, description) VALUES
  ('Caminhão Trator DAF', 'DAF 510 6X2', 'https://picsum.photos/seed/daf/400/300', 'Caminhão para transporte de madeira.'),
  ('Harvester John Deere', '1270E 8x8', 'https://picsum.photos/seed/jd1270/400/300', 'Colheitadeira florestal de alta performance.'),
  ('Trator Valtra', 'BH180', 'https://picsum.photos/seed/valtra/400/300', 'Trator agrícola adaptado para floresta.'),
  ('Escavadeira CAT', '320', 'https://picsum.photos/seed/cat320/400/300', 'Escavadeira hidráulica para movimentação de terra.')
ON CONFLICT DO NOTHING;

-- Peças e Ferramentas
INSERT INTO parts_tools (name, description, category) VALUES
  ('Chave de fenda', 'Chave de fenda Philips', 'tool'),
  ('Martelo', 'Martelo de borracha', 'tool'),
  ('Filtro de óleo', 'Filtro para motor DAF', 'part'),
  ('Correia do alternador', 'Correia original', 'part')
ON CONFLICT DO NOTHING;

-- Templates de Checklist
INSERT INTO checklist_templates (machine_model, items) VALUES
  (
    'DAF 510 6X2',
    '[{"category":"Sistema Hidráulico","items":["Mangueiras","Vazamentos","Ruídos"]},{"category":"Cabine","items":["Cinto de Segurança","Limpador de parabrisas","Buzina","Espelho retrovisor","Iluminação interna"]},{"category":"Freio","items":["Freio de estacionamento","Cilindros","Vazamentos"]},{"category":"Motor Diesel","items":["Vazamentos","Ruídos anormais","Nível de óleo","Correias"]},{"category":"Pneus","items":["Calibragem","Desgastes","Pneu sobressalente"]}]'
  ),
  (
    '1270E 8x8',
    '[{"category":"Bogie/Transmissão","items":["Vazamentos","Ruídos anormais","Nível de óleo"]},{"category":"Cabeçote Harvester","items":["Vazamentos","Mangueiras","Motor da serra","Sensores"]},{"category":"Cabine","items":["Joysticks","Ar condicionado","Painel de instrumentos"]},{"category":"Motor Diesel","items":["Nível de óleo","Radiador","Vazamentos"]}]'
  )
ON CONFLICT (machine_model) DO NOTHING;

-- ============================================
-- RLS (Row Level Security) - Opcional mas recomendado
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- Criar políticas públicas (permitir leitura para todos)
CREATE POLICY "Allow public read" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON machines FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON service_orders FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON parts_tools FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON checklists FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON checklist_templates FOR SELECT USING (true);

-- Criar políticas para insert/update
CREATE POLICY "Allow public insert" ON service_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON service_orders FOR UPDATE USING (true);
CREATE POLICY "Allow public insert" ON parts_tools FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON parts_tools FOR DELETE USING (true);
CREATE POLICY "Allow public insert" ON checklists FOR INSERT WITH CHECK (true);
