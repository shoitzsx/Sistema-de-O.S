import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, X } from 'lucide-react';
import type { NotificationRules } from '../lib/notificationRules';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  type BrowserPermissionState,
} from '../lib/browserNotifications';

interface NotificationSettingsProps {
  open: boolean;
  initialRules: NotificationRules;
  onClose: () => void;
  onSave: (rules: NotificationRules) => void;
}

export default function NotificationSettings({
  open,
  initialRules,
  onClose,
  onSave,
}: NotificationSettingsProps) {
  const [rules, setRules] = useState<NotificationRules>(initialRules);
  const [permission, setPermission] = useState<BrowserPermissionState>('unsupported');

  useEffect(() => {
    if (!open) return;
    setRules(initialRules);
    setPermission(getBrowserNotificationPermission());
  }, [open, initialRules]);

  const permissionLabel =
    permission === 'granted'
      ? 'permitida'
      : permission === 'denied'
      ? 'bloqueada'
      : permission === 'default'
      ? 'pendente'
      : 'nao suportada';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell size={18} className="text-amber-600" /> Configurar notificacoes
              </h3>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">Avisar quando houver O.S em andamento</span>
                <input
                  type="checkbox"
                  checked={rules.enableOpenAlerts}
                  onChange={(e) => setRules((prev) => ({ ...prev, enableOpenAlerts: e.target.checked }))}
                />
              </label>

              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">Avisar quando houver O.S em atraso</span>
                <input
                  type="checkbox"
                  checked={rules.enableOverdueAlerts}
                  onChange={(e) => setRules((prev) => ({ ...prev, enableOverdueAlerts: e.target.checked }))}
                />
              </label>

              <label className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-700">Enviar notificacao nativa quando app estiver em segundo plano</span>
                <input
                  type="checkbox"
                  checked={rules.enableBrowserNotifications}
                  onChange={(e) => setRules((prev) => ({ ...prev, enableBrowserNotifications: e.target.checked }))}
                />
              </label>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Permissao atual de notificacao do navegador: <span className="font-semibold text-slate-800">{permissionLabel}</span>
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const next = await requestBrowserNotificationPermission();
                    setPermission(next);
                  }}
                  className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 text-xs"
                >
                  Solicitar permissao
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Atraso a partir de (horas)</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={rules.overdueHours}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      overdueHours: Math.min(168, Math.max(1, Number(e.target.value || 1))),
                    }))
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Intervalo minimo entre avisos (minutos)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  step={5}
                  value={rules.remindEveryMinutes}
                  onChange={(e) =>
                    setRules((prev) => ({
                      ...prev,
                      remindEveryMinutes: Math.min(180, Math.max(5, Number(e.target.value || 5))),
                    }))
                  }
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => onSave(rules)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg"
              >
                Salvar configuracoes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
