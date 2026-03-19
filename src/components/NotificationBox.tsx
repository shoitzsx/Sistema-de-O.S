import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, CheckCircle, Info, AlertTriangle, Clock, Trash2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocalAuditLogs } from '../lib/audit';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  deleteUserNotification, 
  clearAllUserNotifications,
  createNotification
} from '../lib/supabaseApi';
import { UserNotification } from '../lib/supabase';

interface NotificationBoxProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationBox({ open, onClose }: NotificationBoxProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const isAdmin = user?.role === 'admin' || user?.role === 'administrador';

  const loadNotifications = async () => {
    if (!user) return;
    const remote = await getUserNotifications(user.id);
    
    // Fallback/Legacy: Gerar notificações a partir dos logs de auditoria se não houver remotas
    const logs = getLocalAuditLogs();
    const relevantLogs = logs.filter(log => {
      if (isAdmin) return true;
      if (log.user_id === user.id) return true;
      const details = log.details as any;
      if (details?.assigned_user_id === user.id) return true;
      return false;
    }).slice(0, 10);

    const mappedFromLogs: UserNotification[] = relevantLogs.map(log => {
      let title = 'Notificação';
      let message = '';
      let type: 'info' | 'success' | 'warning' | 'error' = 'info';

      switch (log.action) {
        case 'service_order_created':
          title = isAdmin ? `O.S. Criada por ${log.user_name}` : 'Nova O.S. Criada';
          message = `Ordem de Serviço (#${String(log.entity_id).padStart(4, '0')}) registrada.`;
          break;
        case 'service_order_updated':
          title = isAdmin ? `O.S. #${String(log.entity_id).padStart(4, '0')} Atualizada` : 'O.S. Atualizada';
          message = isAdmin 
            ? `Alterações feitas por ${log.user_name}.` 
            : `A O.S. #${String(log.entity_id).padStart(4, '0')} sofreu alterações.`;
          break;
        case 'service_order_closed':
          title = isAdmin ? `O.S. #${String(log.entity_id).padStart(4, '0')} Finalizada` : 'O.S. Finalizada';
          message = isAdmin 
            ? `Concluída por ${log.user_name}.`
            : `Trabalho concluído na O.S. #${String(log.entity_id).padStart(4, '0')}.`;
          type = 'success';
          break;
        case 'service_order_deleted':
          title = 'O.S. Removida';
          message = isAdmin
            ? `A O.S. #${String(log.entity_id).padStart(4, '0')} foi excluída por ${log.user_name}.`
            : `A O.S. #${String(log.entity_id).padStart(4, '0')} excluída.`;
          type = 'warning';
          break;
      }

      return {
        id: `log_${log.id}`,
        user_id: user.id,
        title,
        message,
        type,
        read: false,
        created_at: log.created_at,
        entity_id: log.entity_id
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
  }, [open, user]);

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
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            />

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            >
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                    <Bell size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Caixa de Notificações</h3>
                </div>
                <button 
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Bell size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhuma notificação por enquanto</p>
                    <p className="text-slate-400 text-sm mt-1">Fique atento às atualizações do sistema</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-4 rounded-xl border flex gap-4 group/item transition-all hover:shadow-sm ${
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{notif.title}</h4>
                          <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap mt-0.5">
                            {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="mt-3 flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-[11px] font-bold text-blue-600 flex items-center gap-1 hover:underline"
                            >
                              <Check size={12} /> Marcar como lida
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="text-[11px] font-bold text-slate-400 flex items-center gap-1 hover:text-red-500 hover:underline"
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

            <div className="bg-slate-50 px-4 py-3 sm:px-6 flex flex-row-reverse justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-5 py-2 bg-slate-900 text-base font-medium text-white hover:bg-slate-800 transition-colors sm:text-sm"
              >
                Fechar
              </button>
              
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition-colors text-sm font-medium"
                >
                  <Trash2 size={14} /> Limpar tudo
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      )}
    </AnimatePresence>
  );
}
