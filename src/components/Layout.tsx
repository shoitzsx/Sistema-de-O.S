import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, ArrowLeft, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getOfflineChecklistSyncSummary, processChecklistSyncQueue } from '../lib/offlineChecklist';
import { getOfflineSyncSummary, processOfflineSyncQueue, clearAllQueueErrors } from '../lib/offlineSync';
import brandLogo from '../assets/aguia-florestal-logo.svg';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [syncInfo, setSyncInfo] = useState({
    online: true,
    pending: 0,
    error: 0,
    blocked: 0,
    syncing: false,
    lastSyncAt: ''
  });

  const refreshSyncInfo = async () => {
    const [globalSummary, checklistSummary] = await Promise.all([
      Promise.resolve(getOfflineSyncSummary()),
      getOfflineChecklistSyncSummary(),
    ]);

    setSyncInfo((prev) => ({
      ...prev,
      online: globalSummary.online && checklistSummary.online,
      pending: globalSummary.pending + checklistSummary.pending,
      error: globalSummary.error + checklistSummary.error,
      blocked: (globalSummary as any).blocked ?? 0,
    }));
  };

  const handleManualSync = async () => {
    setSyncInfo((prev) => ({ ...prev, syncing: true }));

    try {
      await Promise.all([
        processOfflineSyncQueue(true),
        processChecklistSyncQueue()
      ]);

      await refreshSyncInfo();
      setSyncInfo((prev) => ({
        ...prev,
        syncing: false,
        lastSyncAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));

      toast.success('Sincronização executada.');
    } catch (err) {
      setSyncInfo((prev) => ({ ...prev, syncing: false }));
      toast.error('Falha ao sincronizar agora.');
    }
  };

  useEffect(() => {
    void refreshSyncInfo();
    const interval = setInterval(() => {
      void refreshSyncInfo();
    }, 7000);

    const handleOnline = () => {
      void processOfflineSyncQueue();
      void processChecklistSyncQueue();
      void refreshSyncInfo();
    };

    const handleOffline = () => {
      void refreshSyncInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleGoBack = () => {
    // Tenta voltar uma página no histórico; se não for possível, vai para a dashboard
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        aria-label="Notificações"
      />
      <header className="bg-emerald-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-0 sm:h-16 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Botão Voltar */}
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-emerald-700 rounded-full transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <img
              src={brandLogo}
              alt="Águia Florestal"
              className="h-9 w-auto rounded-md bg-white px-1.5 py-1 shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">Águia Florestal</h1>
              <p className="hidden sm:block text-[11px] text-emerald-100/90 uppercase tracking-[0.18em]">
                Operacao e Manutencao
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-emerald-900/50 px-2.5 sm:px-3 py-1.5 rounded-full max-w-[52vw] sm:max-w-none">
              <UserIcon size={16} className="text-emerald-200" />
              <span className="text-xs sm:text-sm font-medium truncate">{user?.name}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-emerald-700 rounded-full transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className={`border-b px-4 sm:px-6 lg:px-8 py-2 text-xs ${syncInfo.online ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {syncInfo.online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="font-medium">
              {syncInfo.online ? 'Conectado' : 'Modo offline'}
            </span>
            <span className="hidden sm:inline">|</span>
            <span>
              {syncInfo.pending} pendente(s)
            </span>
            {syncInfo.error > 0 && (
              <span className="text-red-600 font-semibold">{syncInfo.error} com erro</span>
            )}
            {syncInfo.blocked > 0 && (
              <span className="text-orange-600 font-semibold" title="Itens bloqueados por falta de permissão no Supabase (RLS). Corrija as policies e sincronize novamente, ou limpe os erros.">
                {syncInfo.blocked} bloqueado(s) por permissão
              </span>
            )}
            {syncInfo.lastSyncAt && (
              <span className="hidden md:inline text-slate-600">Última sincronização: {syncInfo.lastSyncAt}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(syncInfo.error > 0 || syncInfo.blocked > 0) && !syncInfo.syncing && (
              <button
                onClick={() => {
                  clearAllQueueErrors();
                  void refreshSyncInfo();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-red-300/40 text-red-700 hover:bg-red-50 transition-colors text-xs"
                title="Limpar erros da fila de sincronização. Os dados permanecem salvos localmente e serão reenviados."
              >
                Limpar erros
              </button>
            )}
            <button
              onClick={handleManualSync}
              disabled={syncInfo.syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-current/20 hover:bg-white/40 disabled:opacity-60 transition-colors"
            >
              <RefreshCw size={13} className={syncInfo.syncing ? 'animate-spin' : ''} />
              {syncInfo.syncing ? 'Sincronizando...' : 'Sincronizar agora'}
            </button>
          </div>
        </div>
      </div>
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {children}
      </main>
    </div>
  );
}