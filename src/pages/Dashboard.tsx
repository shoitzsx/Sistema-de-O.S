import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Wrench, History, BookOpen, CheckSquare, Users, Activity, ShieldCheck, Bell, GraduationCap } from 'lucide-react';
import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getMachines, getPartsTools, getServiceOrders } from '../lib/supabaseApi';
import NotificationBox from '../components/NotificationBox';
import NotificationSettings from '../components/NotificationSettings';
import TutorialCenter, { type TutorialItem } from '../components/TutorialCenter';
import {
  getDefaultNotificationRules,
  getOperationalNotificationRules,
  saveGlobalNotificationRules,
  saveNotificationRules,
  type NotificationRules,
} from '../lib/notificationRules';
import { showBrowserNotification } from '../lib/browserNotifications';
import { canAccessServiceOrderNotifications, hasModuleAccess, isAdminUser } from '../lib/permissions';

interface ServiceOrderSummary {
  id: number;
  status: 'open' | 'closed';
  start_time: string;
  end_time: string | null;
  operator_id: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const canAccessServiceOrders = canAccessServiceOrderNotifications(user);
  const [orders, setOrders] = useState<ServiceOrderSummary[]>([]);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    setNotificationRules(getOperationalNotificationRules(user.id, isAdmin));
  }, [user, isAdmin]);

  const visibleOrders = useMemo(() => {
    if (!user) return [];
    if (!canAccessServiceOrders) return [];
    if (isAdmin) return orders;
    return orders.filter((order) => order.operator_id === user.id);
  }, [orders, user, isAdmin, canAccessServiceOrders]);

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
    if (!canAccessServiceOrders) return;
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
    canAccessServiceOrders,
  ]);

  const handleSaveSettings = (rules: NotificationRules) => {
    if (!user) return;
    setNotificationRules(rules);
    saveNotificationRules(user.id, rules);
    if (isAdmin) {
      saveGlobalNotificationRules(rules);
    }
    setSettingsOpen(false);
    toast.success('Regras de notificação atualizadas.');
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
      id: 6,
      name: 'Histórico de Inspeção',
      description: 'Consulte o histórico mensal de inspeções de checklist.',
      icon: History,
      color: 'bg-cyan-500',
      path: '/checklist-history'
    },
    {
      id: 8,
      name: 'Painel de Controle',
      description: 'Acompanhe indicadores principais de manutenção em tempo real.',
      icon: Activity,
      color: 'bg-sky-500',
      path: '/control-panel'
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
    : modules.filter((m) => hasModuleAccess(user, m.id));

  const tutorialByModuleId: Record<number, TutorialItem> = {
    8: {
      id: 'control-panel',
      title: 'Painel de Controle',
      description: 'Veja rapidamente os principais indicadores operacionais de manutenção.',
      bullets: [
        'Acompanhe O.S abertas para priorizar atendimento.',
        'Monitore O.S em atraso e atue antes de gerar impacto operacional.',
        'Use finalizadas hoje e tempo médio para avaliar performance da equipe.'
      ]
    },
    1: {
      id: 'manuals-operator',
      title: 'Manuais Técnicos',
      description: 'Localize equipamentos e abra rapidamente o manual correto para trabalho em campo.',
      bullets: [
        'Use a busca e os filtros para encontrar o equipamento.',
        'Abra o detalhe do equipamento e clique em Ler Manual.',
        'Confirme se o status mostra Manual Disponível antes de sair para operação.'
      ]
    },
    2: {
      id: 'checklist',
      title: 'Checklist Mensal',
      description: 'Registre inspeções periódicas para reduzir falhas recorrentes.',
      bullets: [
        'Entre em Checklist Mensal e selecione o equipamento.',
        'Preencha item por item e marque as pendências encontradas.',
        'Finalize e valide no histórico de inspeções.'
      ]
    },
    3: {
      id: 'service-orders',
      title: 'Ordens de Serviço',
      description: 'Crie, acompanhe e finalize O.S com rastreabilidade técnica.',
      bullets: [
        'Crie nova O.S com descrição objetiva do problema.',
        'Atualize status durante a execução para manter o time alinhado.',
        'Finalize com relatório completo para histórico e auditoria.'
      ]
    },
    4: {
      id: 'history',
      title: 'Histórico de O.S',
      description: 'Analise serviços passados com filtros e exportação.',
      bullets: [
        'Filtre por período, equipamento e tipo de manutenção.',
        'Abra o detalhe para revisar o relatório final.',
        'Exporte quando precisar compartilhar com supervisão.'
      ]
    },
    5: {
      id: 'users-admin',
      title: 'Gerenciamento de Usuários',
      description: 'Crie perfis e controle quais módulos cada usuário pode acessar.',
      bullets: [
        'Cadastre usuário com perfil correto (admin ou operador).',
        'Defina os módulos permitidos de acordo com a função.',
        'Revise permissões periodicamente para manter segurança operacional.'
      ]
    },
    6: {
      id: 'checklist-history',
      title: 'Histórico de Inspeção',
      description: 'Acompanhe padrões de falhas e evolução das inspeções mensais.',
      bullets: [
        'Use os filtros para localizar inspeções por equipamento e período.',
        'Identifique itens recorrentes com não conformidade.',
        'Use os dados para planejar manutenção preventiva.'
      ]
    },
    7: {
      id: 'audit-admin',
      title: 'Auditoria de Ações',
      description: 'Rastreie quem alterou dados críticos e quando cada ação ocorreu.',
      bullets: [
        'Acesse o módulo de auditoria para revisar eventos recentes.',
        'Filtre por usuário, entidade e período.',
        'Use esse histórico para conformidade e investigação de incidentes.'
      ]
    }
  };

  const adminSpecialTutorials: TutorialItem[] = [
    {
      id: 'admin-manuals-end-to-end',
      title: 'Fluxo Admin Completo: Manuais até Auditoria',
      description: 'Tutorial completo para admins: cadastro de equipamento, upload de manual, revisão e rastreio em auditoria.',
      bullets: [
        'No módulo Manuais, crie ou atualize equipamento e categoria.',
        'Faça upload do manual e confirme o botão Ler Manual disponível.',
        'Valide no Histórico de O.S se a equipe está usando o documento correto.',
        'Abra Auditoria de Ações e confirme os registros de criação/edição/upload.',
        'Use o módulo de Usuários para ajustar permissões conforme necessidade operacional.'
      ]
    },
    {
      id: 'admin-governance',
      title: 'Governança Admin e Boas Práticas',
      description: 'Padronize permissões, qualidade de dados e controles de operação.',
      bullets: [
        'Mantenha permissões mínimas necessárias para cada função.',
        'Padronize nomenclatura de máquinas e componentes.',
        'Revise periodicamente alertas, auditoria e filas de sincronização.'
      ]
    }
  ];

  const availableTutorials = useMemo(() => {
    const moduleTutorials = allowedModules
      .map((module) => tutorialByModuleId[module.id])
      .filter((item): item is TutorialItem => Boolean(item));

    if (!isAdmin) {
      return moduleTutorials;
    }

    return [...adminSpecialTutorials, ...moduleTutorials];
  }, [allowedModules, isAdmin]);

  return (
    <Layout>
      <TutorialCenter
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        tutorials={availableTutorials}
      />
      <NotificationBox
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
      <NotificationSettings
        open={settingsOpen}
        initialRules={notificationRules}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Painel de Controle</h2>
            <p className="text-slate-500">Selecione um módulo para começar</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setTutorialOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 font-medium"
            >
              <GraduationCap size={16} /> Tutorial
            </button>

            {isAdmin && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 font-medium"
              >
                <Activity size={16} /> Configurar Alertas
              </button>
            )}

            <button
              onClick={() => setNotificationOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium"
            >
              <Bell size={16} /> {isAdmin ? 'Notificações Globais' : 'Caixa de notificações'}
            </button>
          </div>
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
