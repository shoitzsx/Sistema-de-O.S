-- Atualiza o banco para suportar o fluxo completo de manutencao preventiva/corretiva.
-- Execute este script apos o schema base no SQL Editor do Supabase.

ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS problem_cause TEXT,
  ADD COLUMN IF NOT EXISTS service_executed TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT;

UPDATE public.service_orders
SET problem_cause = description
WHERE problem_cause IS NULL OR btrim(problem_cause) = '';

ALTER TABLE public.checklists
  ADD COLUMN IF NOT EXISTS checklist_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checklist_finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_id BIGINT,
  ADD COLUMN IF NOT EXISTS schedule_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS schedule_confirmed_by BIGINT,
  ADD COLUMN IF NOT EXISTS schedule_confirmed_by_name TEXT;

ALTER TABLE public.checklist_schedules
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_id BIGINT,
  ADD COLUMN IF NOT EXISTS confirmed_by_name TEXT,
  ADD COLUMN IF NOT EXISTS completed_checklist_id BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checklists_schedule_id_fkey'
  ) THEN
    ALTER TABLE public.checklists
      ADD CONSTRAINT checklists_schedule_id_fkey
      FOREIGN KEY (schedule_id) REFERENCES public.checklist_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checklists_schedule_confirmed_by_fkey'
  ) THEN
    ALTER TABLE public.checklists
      ADD CONSTRAINT checklists_schedule_confirmed_by_fkey
      FOREIGN KEY (schedule_confirmed_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checklist_schedules_confirmed_by_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_schedules
      ADD CONSTRAINT checklist_schedules_confirmed_by_id_fkey
      FOREIGN KEY (confirmed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'checklist_schedules_completed_checklist_id_fkey'
  ) THEN
    ALTER TABLE public.checklist_schedules
      ADD CONSTRAINT checklist_schedules_completed_checklist_id_fkey
      FOREIGN KEY (completed_checklist_id) REFERENCES public.checklists(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE public.checklist_schedules
SET status = 'confirmed'
WHERE status = 'pending';

ALTER TABLE public.checklist_schedules
  DROP CONSTRAINT IF EXISTS checklist_schedules_status_check;

ALTER TABLE public.checklist_schedules
  ADD CONSTRAINT checklist_schedules_status_check
  CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_checklists_schedule_id
  ON public.checklists (schedule_id);

CREATE INDEX IF NOT EXISTS idx_checklist_schedules_status
  ON public.checklist_schedules (status);

CREATE INDEX IF NOT EXISTS idx_checklist_schedules_operator_date
  ON public.checklist_schedules (operator_id, scheduled_date);