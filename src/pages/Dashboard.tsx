import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Wrench, History, BookOpen, CheckSquare, Users, Activity, AlertTriangle, CheckCircle2, Timer, ShieldCheck, Bell } from 'lucide-react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getMachines, getPartsTools, getServiceOrders } from '../lib/supabaseApi';
import FirstLoginOnboarding from '../components/FirstLoginOnboarding';
import NotificationSettings from '../components/NotificationSettings';
import {
  getDefaultNotificationRules,
  getNotificationRules,
  saveNotificationRules,
  type NotificationRules,
} from '../lib/notificationRules';
import { showBrowserNotification } from '../lib/browserNotifications';

interface ServiceOrderSummary {
  id: number;
  status: 'open' | 'closed';
  start_time: string;
  end_time: string | null;
  operator_id: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';
  const [orders, setOrders] = useState<ServiceOrderSummary[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationRules, setNotificationRules] = useState<NotificationRules>(getDefaultNotificationRules());

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [serviceOrders] = await Promise.all([
          getServiceOrders(),
          getMachines(),
          getPartsTools(),
        ]);

        setOrders((serviceOrders || []).map((order) => ({
          id: order.id,
          status: order.status,
          start_time: order.start_time,
          end_time: order.end_time,
          operator_id: order.operator_id,
        })));
      } catch (err) {
        console.error('Erro ao carregar indicadores do dashboard:', err);
      }
    };

    void loadDashboardData();
    const interval = setInterval(() => {
      void loadDashboardData();
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    const key = `onboarding-dismissed:${user.id}`;
    const alreadyDismissed = localStorage.getItem(key) === '1';
    if (!alreadyDismissed) {
      setOnboardingOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setNotificationRules(getNotificationRules(user.id));
  }, [user]);

  const visibleOrders = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return orders;
    return orders.filter((order) => order.operator_id === user.id);
  }, [orders, user, isAdmin]);

  const kpis = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const open = visibleOrders.filter((order) => order.status === 'open').length;

    const overdue = visibleOrders.filter((order) => {
      if (order.status !== 'open') return false;
      const startedAt = new Date(order.start_time).getTime();
      return now - startedAt > notificationRules.overdueHours * 60 * 60 * 1000;
    }).length;

    const closedToday = visibleOrders.filter((order) => {
      if (order.status !== 'closed' || !order.end_time) return false;
      return new Date(order.end_time).getTime() >= startOfToday.getTime();
    }).length;

    const closedWithDuration = visibleOrders.filter((order) => order.status === 'closed' && order.end_time);
    const avgCloseMs = closedWithDuration.length
      ? closedWithDuration.reduce((acc, order) => {
          const start = new Date(order.start_time).getTime();
          const end = order.end_time ? new Date(order.end_time).getTime() : start;
          return acc + Math.max(0, end - start);
        }, 0) / closedWithDuration.length
      : 0;

    const avgHours = avgCloseMs / (1000 * 60 * 60);

    return {
      open,
      overdue,
      closedToday,
      avgCloseHours: Number.isFinite(avgHours) ? avgHours : 0,
    };
  }, [visibleOrders, notificationRules.overdueHours]);

  useEffect(() => {
    if (!user) return;
    if (visibleOrders.length === 0) return;

    const key = `dashboard-alert-last:${user.id}`;
    const lastAt = Number(localStorage.getItem(key) || '0');
    const minInterval = notificationRules.remindEveryMinutes * 60 * 1000;
    const now = Date.now();

    if (now - lastAt < minInterval) return;

    if (notificationRules.enableOpenAlerts && kpis.open > 0) {
      toast.info(`Você tem ${kpis.open} O.S em andamento.`);
    }

    if (notificationRules.enableOverdueAlerts && kpis.overdue > 0) {
      toast.warning(`${kpis.overdue} O.S estão em atraso (mais de ${notificationRules.overdueHours}h).`);
    }

    const messages: string[] = [];
    if (notificationRules.enableOpenAlerts && kpis.open > 0) {
      messages.push(`${kpis.open} O.S em andamento`);
    }
    if (notificationRules.enableOverdueAlerts && kpis.overdue > 0) {
      messages.push(`${kpis.overdue} O.S em atraso`);
    }

    if (
      notificationRules.enableBrowserNotifications &&
      messages.length > 0 &&
      typeof document !== 'undefined' &&
      document.hidden
    ) {
      const targetPath = kpis.overdue > 0 ? '/history' : '/service-orders';
      showBrowserNotification(
        'Aguia Florestal',
        messages.join(' | '),
        {
          tag: user ? `dashboard-alert-${user.id}` : 'dashboard-alert',
          navigateTo: targetPath,
        }
      );
    }

    localStorage.setItem(key, String(now));
  }, [
    kpis.open,
    kpis.overdue,
    user,
    visibleOrders.length,
    notificationRules.enableOpenAlerts,
    notificationRules.enableOverdueAlerts,
    notificationRules.enableBrowserNotifications,
    notificationRules.overdueHours,
    notificationRules.remindEveryMinutes,
  ]);

  const handleSaveNotificationRules = (rules: NotificationRules) => {
    if (!user) return;

    setNotificationRules(rules);
    saveNotificationRules(user.id, rules);
    setNotificationOpen(false);
    toast.success('Configurações de notificação atualizadas.');
  };

  const handleCloseOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding-dismissed:${user.id}`, '1');
    }
    setOnboardingOpen(false);
  };

  const modules = [
    {
      id: 1,
      name: 'Manuais Técnicos',
      description: 'Gerenciar manuais e documentação de equipamentos.',
      icon: BookOpen,
      color: 'bg-blue-500',
      path: '/manuals'
    },
    {
      id: 2,
      name: 'Checklist Mensal',
      description: 'Realizar checklists mensais de equipamentos.',
      icon: CheckSquare,
      color: 'bg-green-500',
      path: '/checklist'
    },
    {
      id: 3,
      name: 'Ordens de Serviço',
      description: 'Criar e gerenciar ordens de serviço e manutenção.',
      icon: Wrench,
      color: 'bg-orange-500',
      path: '/service-orders'
    },
    {
      id: 4,
      name: 'Histórico de O.S',
      description: 'Consulte todas as ordens de serviço criadas.',
      icon: History,
      color: 'bg-indigo-500',
      path: '/history'
    },
    {
      id: 5,
      name: 'Gerenciar Usuários',
      description: 'Criar, editar e remover usuários do sistema.',
      icon: Users,
      color: 'bg-purple-500',
      path: '/users'
    },
    {
      id: 6,
      name: 'Histórico de Inspeção',
      description: 'Consulte o histórico mensal de inspeções de checklist.',
      icon: History,
      color: 'bg-cyan-500',
      path: '/checklist-history'
    },
    {
      id: 7,
      name: 'Auditoria de Ações',
      description: 'Rastreie quem criou, editou, finalizou ou excluiu O.S.',
      icon: ShieldCheck,
      color: 'bg-slate-700',
      path: '/audit'
    }
  ];

  const allowedModules = isAdmin
    ? modules
    : modules.filter(m => user?.allowed_modules.includes(m.id));

  return (
    <Layout>
      <FirstLoginOnboarding open={onboardingOpen} onClose={handleCloseOnboarding} />
      <NotificationSettings
        open={notificationOpen}
        initialRules={notificationRules}
        onClose={() => setNotificationOpen(false)}
        onSave={handleSaveNotificationRules}
      />

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Painel de Controle</h2>
            <p className="text-slate-500">Selecione um módulo para começar</p>
          </div>
          <button
            onClick={() => setNotificationOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium"
          >
            <Bell size={16} /> Configurar notificações
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">O.S abertas</p>
            <Activity size={18} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.open}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">O.S em atraso</p>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.overdue}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Finalizadas hoje</p>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.closedToday}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Tempo médio de fechamento</p>
            <Timer size={18} className="text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.avgCloseHours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allowedModules.map((module, index) => (
          <Link key={module.id} to={module.path}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-slate-100 h-full flex flex-col"
            >
              <div className={`${module.color} w-14 h-14 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-opacity-20`}>
                <module.icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{module.name}</h3>
              <p className="text-slate-500 text-sm leading-relaxed flex-1">{module.description}</p>
              <div className="mt-6 flex items-center text-sm font-medium text-slate-900 group">
                Acessar Módulo
                <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
