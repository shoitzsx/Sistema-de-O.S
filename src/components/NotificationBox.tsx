import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, CheckCircle, Info, AlertTriangle, Trash2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocalAuditLogs, isRemoteAuditEnabled } from '../lib/audit';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  deleteUserNotification, 
  clearAllUserNotifications
} from '../lib/supabaseApi';
import { UserNotification } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { canAccessServiceOrderNotifications, isAdminUser } from '../lib/permissions';

interface NotificationBoxProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationBox({ open, onClose }: NotificationBoxProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const isAdmin = isAdminUser(user);
  const canAccessServiceOrders = canAccessServiceOrderNotifications(user);

  const loadNotifications = async () => {
    if (!user) return;

    if (!canAccessServiceOrders) {
      setNotifications([]);
      return;
    }

    const remote = await getUserNotifications(user.id);

    const localLogs = getLocalAuditLogs();
    let remoteLogs: Array<{
      id?: string | number;
      action: string;
      entity_id?: number | null;
      details?: Record<string, unknown> | null;
      user_id?: number;
      user_name?: string;
      created_at: string;
    }> = [];

    if (isRemoteAuditEnabled()) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, action, entity_id, details, user_id, user_name, created_at')
          .in('action', ['service_order_created', 'service_order_updated', 'service_order_closed', 'service_order_deleted'])
          .order('created_at', { ascending: false })
          .limit(200);

        if (!error) {
          remoteLogs = (data || []).map((row: any) => ({
            id: row.id,
            action: String(row.action || ''),
            entity_id: Number(row.entity_id || 0) || null,
            details: typeof row.details === 'object' && row.details ? (row.details as Record<string, unknown>) : {},
            user_id: Number(row.user_id || 0),
            user_name: String(row.user_name || ''),
            created_at: String(row.created_at || ''),
          }));
        }
      } catch {
        // fallback local only
      }
    }

    // Fallback/Legacy: gerar notificações de auditoria local e remota
    const logs = [...remoteLogs, ...localLogs];
    const relevantLogs = logs.filter((log) => {
      if (isAdmin) return true;
      if (Number(log.user_id || 0) === user.id) return true;
      const details = (log.details || {}) as Record<string, unknown>;
      if (Number(details.assigned_user_id || 0) === user.id) return true;
      if (Number(details.started_by_user_id || 0) === user.id) return true;
      if (Number(details.operator_id || 0) === user.id) return true;
      return false;
    }).slice(0, 20);

    const mappedFromLogs: UserNotification[] = relevantLogs.map((log) => {
      let title = 'Notificação';
      let message = '';
      let type: 'info' | 'success' | 'warning' | 'error' = 'info';

      switch (log.action) {
        case 'service_order_created':
          title = isAdmin ? `O.S. Criada por ${String(log.user_name || 'usuário')}` : 'Nova O.S. Criada';
          message = `Ordem de Serviço (#${String(log.entity_id).padStart(4, '0')}) registrada.`;
          break;
        case 'service_order_updated':
          title = isAdmin ? `O.S. #${String(log.entity_id).padStart(4, '0')} Atualizada` : 'O.S. Atualizada';
          message = isAdmin 
            ? `Alterações feitas por ${String(log.user_name || 'usuário')}.` 
            : `A O.S. #${String(log.entity_id).padStart(4, '0')} sofreu alterações.`;
          break;
        case 'service_order_closed':
          title = isAdmin ? `O.S. #${String(log.entity_id).padStart(4, '0')} Finalizada` : 'O.S. Finalizada';
          message = isAdmin 
            ? `Concluída por ${String(log.user_name || 'usuário')}.`
            : `Trabalho concluído na O.S. #${String(log.entity_id).padStart(4, '0')}.`;
          type = 'success';
          break;
        case 'service_order_deleted':
          title = 'O.S. Removida';
          message = isAdmin
            ? `A O.S. #${String(log.entity_id).padStart(4, '0')} foi excluída por ${String(log.user_name || 'usuário')}.`
            : `A O.S. #${String(log.entity_id).padStart(4, '0')} excluída.`;
          type = 'warning';
          break;
      }

      return {
        id: `log_${String(log.id || `${log.action}_${log.entity_id || 0}_${log.created_at}`)}`,
        user_id: user.id,
        title,
        message,
        type,
        read: false,
        created_at: String(log.created_at || new Date().toISOString()),
        entity_id: Number(log.entity_id || 0) || null
      };
    });

    const combined = [...remote];
    const remoteIds = new Set(remote.map(r => r.entity_id).filter(Boolean));
    
    mappedFromLogs.forEach(n => {
      if (!n.entity_id || !remoteIds.has(n.entity_id)) {
        combined.push(n);
      }
    });

    setNotifications(combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  useEffect(() => {
    if (open && user) {
      void loadNotifications();
    }
  }, [open, user, canAccessServiceOrders]);

  const handleMarkAsRead = async (id: string) => {
    if (id.startsWith('log_')) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      return;
    }
    await markNotificationAsRead(id);
    void loadNotifications();
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('log_')) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      return;
    }
    await deleteUserNotification(id);
    void loadNotifications();
  };

  const clearAll = async () => {
    if (!user) return;
    await clearAllUserNotifications(user.id);
    setNotifications([]);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center p-0 sm:items-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 16 }}
              className="relative z-10 flex h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white text-left shadow-2xl sm:h-[85dvh] sm:max-w-xl sm:rounded-2xl md:max-w-2xl lg:max-w-3xl"
            >
              <div className="bg-white px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
              <div className="mb-4 flex items-center justify-between sm:mb-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600">
                    <Bell size={18} />
                  </div>
                  <h3 className="truncate text-base font-bold text-slate-900 sm:text-xl">Caixa de Notificações</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[calc(90dvh-9.5rem)] space-y-3 overflow-y-auto pr-1 sm:max-h-[calc(85dvh-10.5rem)] sm:pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center sm:py-12">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 sm:h-16 sm:w-16">
                      <Bell size={32} />
                    </div>
                    <p className="font-medium text-slate-500">Nenhuma notificação por enquanto</p>
                    <p className="mt-1 text-sm text-slate-400">Fique atento às atualizações do sistema</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`group/item flex gap-3 rounded-xl border p-3 transition-all hover:shadow-sm sm:gap-4 sm:p-4 ${
                        notif.read ? 'bg-white border-slate-100' : 'bg-blue-50/30 border-blue-100'
                      }`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        notif.type === 'success' ? 'bg-green-100 text-green-600' :
                        notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                        notif.type === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {notif.type === 'success' ? <CheckCircle size={18} /> :
                         notif.type === 'warning' ? <AlertTriangle size={18} /> :
                         notif.type === 'error' ? <AlertTriangle size={18} /> :
                         <Info size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="truncate text-sm font-bold text-slate-900">{notif.title}</h4>
                          <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium text-slate-400">
                            {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">
                          {notif.message}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 sm:opacity-0 sm:transition-opacity sm:group-hover/item:opacity-100">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              <Check size={12} /> Marcar como lida
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-red-500 hover:underline"
                          >
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
              {notifications.length > 0 ? (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-red-500"
                >
                  <Trash2 size={14} /> Limpar tudo
                </button>
              ) : (
                <span className="text-xs text-slate-400">Sem ações pendentes</span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-xl border border-transparent bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 sm:px-5"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      </div>
      )}
    </AnimatePresence>
  );
}
