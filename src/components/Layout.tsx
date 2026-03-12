import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, ArrowLeft, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getOfflineChecklistSyncSummary, processChecklistSyncQueue } from '../lib/offlineChecklist';
import { getOfflineSyncSummary, processOfflineSyncQueue } from '../lib/offlineSync';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [syncInfo, setSyncInfo] = useState({
    online: true,
    pending: 0,
    error: 0,
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
    }));
  };

  const handleManualSync = async () => {
    setSyncInfo((prev) => ({ ...prev, syncing: true }));

    try {
      await Promise.all([
        processOfflineSyncQueue(),
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
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <span className="font-bold text-lg">A</span>
            </div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">Águia Florestal</h1>
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
              <span className="text-red-700 font-semibold">{syncInfo.error} com erro</span>
            )}
            {syncInfo.lastSyncAt && (
              <span className="hidden md:inline text-slate-600">Última sincronização: {syncInfo.lastSyncAt}</span>
            )}
          </div>

          <div>
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