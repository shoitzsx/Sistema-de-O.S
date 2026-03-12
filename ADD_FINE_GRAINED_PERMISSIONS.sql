-- Permissoes granulares por acao para O.S
-- Execute apos schema base

CREATE TABLE IF NOT EXISTS role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (role, module, action)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, module, action)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup
  ON role_permissions(role, module, action);

CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup
  ON user_permissions(user_id, module, action);

-- Matriz padrao por papel
INSERT INTO role_permissions (role, module, action, allowed) VALUES
  ('admin', 'service_orders', 'create', true),
  ('admin', 'service_orders', 'edit', true),
  ('admin', 'service_orders', 'finalize', true),
  ('admin', 'service_orders', 'reopen', true),
  ('admin', 'service_orders', 'delete', true),
  ('admin', 'service_orders', 'export', true),

  ('operator', 'service_orders', 'create', true),
  ('operator', 'service_orders', 'edit', true),
  ('operator', 'service_orders', 'finalize', true),
  ('operator', 'service_orders', 'reopen', false),
  ('operator', 'service_orders', 'delete', false),
  ('operator', 'service_orders', 'export', false)
ON CONFLICT (role, module, action) DO UPDATE SET
  allowed = EXCLUDED.allowed,
  updated_at = NOW();

-- Helper para resolver permissao final (override de usuario > role)
CREATE OR REPLACE FUNCTION has_user_permission(
  p_user_id BIGINT,
  p_role TEXT,
  p_module TEXT,
  p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  override_allowed BOOLEAN;
  role_allowed BOOLEAN;
BEGIN
  SELECT allowed INTO override_allowed
  FROM user_permissions
  WHERE user_id = p_user_id
    AND module = p_module
    AND action = p_action
  LIMIT 1;

  IF override_allowed IS NOT NULL THEN
    RETURN override_allowed;
  END IF;

  SELECT allowed INTO role_allowed
  FROM role_permissions
  WHERE role = p_role
    AND module = p_module
    AND action = p_action
  LIMIT 1;

  RETURN COALESCE(role_allowed, false);
END;
$$;
