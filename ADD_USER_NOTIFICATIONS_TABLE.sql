
-- Tabela para persistência de notificações individuais de usuários
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    entity_id BIGINT, -- Opcional: ID da O.S. ou Checklist relacionado
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só pode ler/atualizar suas próprias notificações
CREATE POLICY "Users can only see their own notifications"
ON public.user_notifications
FOR ALL
USING (user_id = (auth.jwt() ->> 'id')::bigint);

-- Política: Sistema/Admin pode inserir notificações para qualquer um
CREATE POLICY "Anyone can insert notifications (for system events)"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON public.user_notifications(created_at DESC);
