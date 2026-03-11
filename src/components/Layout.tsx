import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getOfflineChecklistSyncSummary, processChecklistSyncQueue } from '../lib/offlineChecklist';
import { getOfflineSyncSummary, processOfflineSyncQueue } from '../lib/offlineSync';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [syncInfo, setSyncInfo] = useState({ online: true, pending: 0, errors: 0 });

  useEffect(() => {
    const refresh = async () => {
      const [globalSummary, checklistSummary] = await Promise.all([
        Promise.resolve(getOfflineSyncSummary()),
        getOfflineChecklistSyncSummary(),
      ]);

      setSyncInfo({
        online: globalSummary.online && checklistSummary.online,
        pending: globalSummary.pending + checklistSummary.pending,
        errors: globalSummary.error + checklistSummary.error,
      });
    };

    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, 7000);

    const handleOnline = () => {
      void processOfflineSyncQueue();
      void processChecklistSyncQueue();
      void refresh();
    };

    const handleOffline = () => {
      void refresh();
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Botão Voltar */}
            <button
              onClick={handleGoBack}
              className="p-2 hover:bg-emerald-700 rounded-full transition-colors mr-2"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <span className="font-bold text-lg">A</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Águia Florestal</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-900/50 px-3 py-1.5 rounded-full">
              <UserIcon size={16} className="text-emerald-200" />
              <span className="text-sm font-medium">{user?.name}</span>
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
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <span>
            {syncInfo.online ? 'Conectado' : 'Modo offline'}
          </span>
          <span>
            Pendentes: {syncInfo.pending} | Erros: {syncInfo.errors}
          </span>
        </div>
      </div>
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}