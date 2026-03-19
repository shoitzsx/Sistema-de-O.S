-- Add explicit assignment fields to service orders
-- Run this in Supabase SQL editor

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS assigned_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS assigned_user_name TEXT;

CREATE INDEX IF NOT EXISTS idx_service_orders_assigned_user_id
  ON service_orders (assigned_user_id);

UPDATE service_orders so
SET assigned_user_name = u.name
FROM users u
WHERE so.assigned_user_id = u.id
  AND (so.assigned_user_name IS NULL OR so.assigned_user_name = '');
