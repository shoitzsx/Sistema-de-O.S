import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Timer } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getServiceOrders } from '../lib/supabaseApi';

interface ServiceOrderSummary {
  id: number;
  status: 'open' | 'closed';
  start_time: string;
  end_time: string | null;
  operator_id: number;
}

export default function ControlPanel() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';
  const [orders, setOrders] = useState<ServiceOrderSummary[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const serviceOrders = await getServiceOrders();
        setOrders(
          (serviceOrders || []).map((order) => ({
            id: order.id,
            status: order.status,
            start_time: order.start_time,
            end_time: order.end_time,
            operator_id: order.operator_id,
          }))
        );
      } catch (err) {
        console.error('Erro ao carregar painel de controle:', err);
      }
    };

    void loadData();
    const interval = setInterval(() => {
      void loadData();
    }, 90000);

    return () => clearInterval(interval);
  }, []);

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
      return now - startedAt > 24 * 60 * 60 * 1000;
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
  }, [visibleOrders]);

  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Painel de Controle</h2>
        <p className="text-slate-500">Visão rápida dos indicadores operacionais</p>
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
            <p className="text-sm font-medium text-slate-600">Tempo medio de fechamento</p>
            <Timer size={18} className="text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.avgCloseHours.toFixed(1)}h</p>
        </div>
      </div>
    </Layout>
  );
}
