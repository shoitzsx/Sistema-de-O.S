import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, AlertTriangle, Calendar, CheckCircle, CheckCircle2, Timer, TrendingUp, Maximize2, X } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getChecklists, getServiceOrders } from '../lib/supabaseApi';

interface ServiceOrderSummary {
  id: number;
  status: 'open' | 'closed';
  start_time: string;
  end_time: string | null;
  operator_id: number;
}

interface ChecklistSummary {
  status: 'pending' | 'completed' | string;
  date: string;
  operator_id: number;
}

function toSafeDate(value: unknown): Date {
  const parsed = new Date(typeof value === 'string' && value ? value : Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toShortLabel(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

type HistoryRange = 7 | 15 | 30;

interface HoveredHistoryPoint {
  key: string;
  label: string;
  count: number;
  x: number;
  y: number;
  index: number;
}

export default function ControlPanel() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';
  const [orders, setOrders] = useState<ServiceOrderSummary[]>([]);
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [historyRange, setHistoryRange] = useState<HistoryRange>(30);
  const [hoveredHistoryPoint, setHoveredHistoryPoint] = useState<HoveredHistoryPoint | null>(null);
  const [isHistoryTooltipPinned, setIsHistoryTooltipPinned] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

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

  useEffect(() => {
    const loadChecklistSummary = async () => {
      try {
        const data = await getChecklists();
        setChecklists(
          (data || []).map((item: any) => ({
            status: String(item.status || 'pending'),
            date: String(item.date || item.created_at || new Date().toISOString()),
            operator_id: Number(item.operator_id || 0),
          }))
        );
      } catch (err) {
        console.error('Erro ao carregar indicadores de checklist:', err);
      }
    };

    void loadChecklistSummary();
    const interval = setInterval(() => {
      void loadChecklistSummary();
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

  const maintenanceHistory = useMemo(() => {
    const days: Array<{ key: string; label: string; count: number }> = [];
    const counts = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - (historyRange - 1));

    for (let i = 0; i < historyRange; i += 1) {
      const cursor = new Date(firstDay);
      cursor.setDate(firstDay.getDate() + i);

      const key = toDateKey(cursor);
      counts.set(key, 0);
      days.push({ key, label: toShortLabel(cursor), count: 0 });
    }

    visibleOrders.forEach((order) => {
      const date = toSafeDate(order.start_time);
      date.setHours(0, 0, 0, 0);
      const key = toDateKey(date);
      if (counts.has(key)) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });

    return days.map((day) => ({
      ...day,
      count: counts.get(day.key) || 0,
    }));
  }, [visibleOrders, historyRange]);

  const maintenanceHistorySummary = useMemo(() => {
    const total = maintenanceHistory.reduce((acc, item) => acc + item.count, 0);
    const averagePerDay = maintenanceHistory.length ? total / maintenanceHistory.length : 0;
    const peak = maintenanceHistory.reduce(
      (best, current) => (current.count > best.count ? current : best),
      maintenanceHistory[0] || { key: '', label: '-', count: 0 }
    );

    return {
      total,
      averagePerDay,
      peak,
    };
  }, [maintenanceHistory]);

  const chartGeometry = useMemo(() => {
    const width = Math.max(860, maintenanceHistory.length * 44);
    const height = 280;
    const paddingLeft = 42;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    const maxValue = Math.max(1, ...maintenanceHistory.map((item) => item.count));
    const segments = Math.max(maintenanceHistory.length - 1, 1);

    const points = maintenanceHistory.map((item, index) => {
      const x = paddingLeft + (index / segments) * plotWidth;
      const y = paddingTop + (1 - item.count / maxValue) * plotHeight;
      return { ...item, x, y, index };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = Math.round((maxValue / 4) * index);
      const y = paddingTop + (1 - value / maxValue) * plotHeight;
      return { value, y };
    });

    const maxVisibleLabels = width >= 1100 ? 12 : 9;
    const labelStep = Math.max(1, Math.ceil(maintenanceHistory.length / maxVisibleLabels));

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      plotWidth,
      points,
      linePath,
      yTicks,
      labelStep,
    };
  }, [maintenanceHistory]);

  useEffect(() => {
    setHoveredHistoryPoint(null);
    setIsHistoryTooltipPinned(false);
  }, [historyRange]);

  const checklistKpis = useMemo(() => {
    const visible = isAdmin
      ? checklists
      : checklists.filter((entry) => entry.operator_id === user?.id);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const pending = visible.filter((entry) => entry.status !== 'completed').length;
    const completed = visible.filter((entry) => entry.status === 'completed').length;
    const completedToday = visible.filter((entry) => {
      if (entry.status !== 'completed') return false;
      return toSafeDate(entry.date).getTime() >= startOfToday.getTime();
    }).length;

    const completionRate = visible.length > 0 ? (completed / visible.length) * 100 : 0;

    return {
      pending,
      completed,
      completedToday,
      completionRate,
    };
  }, [checklists, isAdmin, user?.id]);

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
            <p className="text-sm font-medium text-slate-600">Tempo médio de fechamento</p>
            <Timer size={18} className="text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{kpis.avgCloseHours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-600" /> Histórico de Manutenção
            </h3>
            <p className="text-slate-500 text-sm">Ordens de serviço criadas por dia no período selecionado</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-slate-100 rounded-lg p-1">
              {([
                { label: '7 dias', value: 7 },
                { label: '15 dias', value: 15 },
                { label: '30 dias', value: 30 },
              ] as Array<{ label: string; value: HistoryRange }>).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setHistoryRange(option.value)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    historyRange === option.value
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsChartExpanded(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Expandir gráfico"
              aria-label="Expandir gráfico para tela cheia"
            >
              <Maximize2 size={16} />
              <span className="hidden sm:inline">Expandir</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total no período</p>
            <p className="text-2xl font-bold text-slate-900">{maintenanceHistorySummary.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Média por dia</p>
            <p className="text-2xl font-bold text-slate-900">{maintenanceHistorySummary.averagePerDay.toFixed(1)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Dia de pico</p>
            <p className="text-2xl font-bold text-slate-900">
              {maintenanceHistorySummary.peak.label} <span className="text-base text-slate-600">({maintenanceHistorySummary.peak.count})</span>
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          <svg
            viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
            className="w-auto min-w-full h-auto"
            style={{ minHeight: '360px' }}
            onMouseLeave={() => {
              if (!isHistoryTooltipPinned) {
                setHoveredHistoryPoint(null);
              }
            }}
            onClick={() => {
              if (isHistoryTooltipPinned) {
                setHoveredHistoryPoint(null);
                setIsHistoryTooltipPinned(false);
              }
            }}
          >
            {chartGeometry.yTicks.map((tick) => (
              <g key={`tick-${tick.value}-${tick.y}`}>
                <line
                  x1={chartGeometry.paddingLeft}
                  y1={tick.y}
                  x2={chartGeometry.paddingLeft + chartGeometry.plotWidth}
                  y2={tick.y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text
                  x={chartGeometry.paddingLeft - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  className="fill-slate-500"
                  style={{ fontSize: '12px' }}
                >
                  {tick.value}
                </text>
              </g>
            ))}

            <path d={chartGeometry.linePath} fill="none" stroke="#059669" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

            {hoveredHistoryPoint && (
              <line
                x1={hoveredHistoryPoint.x}
                y1={chartGeometry.paddingTop}
                x2={hoveredHistoryPoint.x}
                y2={chartGeometry.height - chartGeometry.paddingBottom}
                stroke="#94a3b8"
                strokeWidth={1.5}
              />
            )}

            {chartGeometry.points.map((point) => (
              <g
                key={point.key}
                onMouseEnter={() => {
                  if (!isHistoryTooltipPinned) {
                    setHoveredHistoryPoint(point);
                  }
                }}
                onMouseMove={() => {
                  if (!isHistoryTooltipPinned) {
                    setHoveredHistoryPoint(point);
                  }
                }}
                onMouseLeave={() => {
                  if (!isHistoryTooltipPinned) {
                    setHoveredHistoryPoint((current) => (current?.key === point.key ? null : current));
                  }
                }}
                onTouchStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (isHistoryTooltipPinned && hoveredHistoryPoint?.key === point.key) {
                    setHoveredHistoryPoint(null);
                    setIsHistoryTooltipPinned(false);
                    return;
                  }

                  setHoveredHistoryPoint(point);
                  setIsHistoryTooltipPinned(true);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredHistoryPoint?.key === point.key ? 7 : 5}
                  fill="#059669"
                  stroke="#ffffff"
                  strokeWidth={2}
                  className="transition-all"
                />
                <circle cx={point.x} cy={point.y} r={14} fill="transparent" />
                <text
                  x={point.x}
                  y={chartGeometry.height - 12}
                  textAnchor="middle"
                  className="fill-slate-600"
                  style={{ fontSize: '12px' }}
                >
                  {point.index % chartGeometry.labelStep === 0 || point.index === chartGeometry.points.length - 1
                    ? point.label
                    : ''}
                </text>
              </g>
            ))}

            {hoveredHistoryPoint && (
              <g pointerEvents="none">
                {(() => {
                  const tooltipWidth = 230;
                  const tooltipHeight = 64;
                  const desiredX = hoveredHistoryPoint.x - tooltipWidth / 2;
                  const minX = chartGeometry.paddingLeft;
                  const maxX = chartGeometry.width - chartGeometry.paddingRight - tooltipWidth;
                  const tooltipX = Math.min(maxX, Math.max(minX, desiredX));
                  const tooltipY = Math.max(12, hoveredHistoryPoint.y - tooltipHeight - 16);

                  return (
                    <>
                      <rect
                        x={tooltipX}
                        y={tooltipY}
                        width={tooltipWidth}
                        height={tooltipHeight}
                        rx={10}
                        fill="#ffffff"
                        stroke="#e2e8f0"
                        strokeWidth={1}
                        style={{ filter: 'drop-shadow(0 8px 20px rgba(15, 23, 42, 0.12))' }}
                      />
                      <text x={tooltipX + 14} y={tooltipY + 26} className="fill-slate-900" style={{ fontSize: '20px', fontWeight: 700 }}>
                        {hoveredHistoryPoint.label}
                      </text>
                      <text x={tooltipX + 14} y={tooltipY + 50} className="fill-emerald-700" style={{ fontSize: '20px', fontWeight: 600 }}>
                        Ordens de Serviço: {hoveredHistoryPoint.count}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>
      </div>

      {isChartExpanded && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setIsChartExpanded(false)}>
          <div
            className="bg-white rounded-2xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-2xl font-bold text-slate-900">Histórico de Manutenção</h3>
              <button
                onClick={() => setIsChartExpanded(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Fechar gráfico expandido"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 flex flex-col">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <p className="text-slate-500">Ordens de serviço criadas por dia no período selecionado</p>
                </div>

                <div className="inline-flex bg-slate-100 rounded-lg p-1">
                  {([
                    { label: '7 dias', value: 7 },
                    { label: '15 dias', value: 15 },
                    { label: '30 dias', value: 30 },
                  ] as Array<{ label: string; value: HistoryRange }>).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setHistoryRange(option.value)}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                        historyRange === option.value
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total no período</p>
                  <p className="text-2xl font-bold text-slate-900">{maintenanceHistorySummary.total}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Média por dia</p>
                  <p className="text-2xl font-bold text-slate-900">{maintenanceHistorySummary.averagePerDay.toFixed(1)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Dia de pico</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {maintenanceHistorySummary.peak.label} <span className="text-base text-slate-600">({maintenanceHistorySummary.peak.count})</span>
                  </p>
                </div>
              </div>

              <div className="w-full overflow-x-auto flex-1 flex items-center" style={{ WebkitOverflowScrolling: 'touch' }}>
                <svg
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  className="w-auto h-auto"
                  style={{ minHeight: '500px', margin: '0 auto' }}
                  onMouseLeave={() => {
                    if (!isHistoryTooltipPinned) {
                      setHoveredHistoryPoint(null);
                    }
                  }}
                  onClick={() => {
                    if (isHistoryTooltipPinned) {
                      setHoveredHistoryPoint(null);
                      setIsHistoryTooltipPinned(false);
                    }
                  }}
                >
                  {chartGeometry.yTicks.map((tick) => (
                    <g key={`tick-expanded-${tick.value}-${tick.y}`}>
                      <line
                        x1={chartGeometry.paddingLeft}
                        y1={tick.y}
                        x2={chartGeometry.paddingLeft + chartGeometry.plotWidth}
                        y2={tick.y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartGeometry.paddingLeft - 10}
                        y={tick.y + 4}
                        textAnchor="end"
                        className="fill-slate-500"
                        style={{ fontSize: '14px' }}
                      >
                        {tick.value}
                      </text>
                    </g>
                  ))}

                  <path d={chartGeometry.linePath} fill="none" stroke="#059669" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />

                  {hoveredHistoryPoint && (
                    <line
                      x1={hoveredHistoryPoint.x}
                      y1={chartGeometry.paddingTop}
                      x2={hoveredHistoryPoint.x}
                      y2={chartGeometry.height - chartGeometry.paddingBottom}
                      stroke="#94a3b8"
                      strokeWidth={2}
                    />
                  )}

                  {chartGeometry.points.map((point) => (
                    <g
                      key={`expanded-${point.key}`}
                      onMouseEnter={() => {
                        if (!isHistoryTooltipPinned) {
                          setHoveredHistoryPoint(point);
                        }
                      }}
                      onMouseMove={() => {
                        if (!isHistoryTooltipPinned) {
                          setHoveredHistoryPoint(point);
                        }
                      }}
                      onMouseLeave={() => {
                        if (!isHistoryTooltipPinned) {
                          setHoveredHistoryPoint((current) => (current?.key === point.key ? null : current));
                        }
                      }}
                      onTouchStart={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (isHistoryTooltipPinned && hoveredHistoryPoint?.key === point.key) {
                          setHoveredHistoryPoint(null);
                          setIsHistoryTooltipPinned(false);
                          return;
                        }

                        setHoveredHistoryPoint(point);
                        setIsHistoryTooltipPinned(true);
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={hoveredHistoryPoint?.key === point.key ? 9 : 6}
                        fill="#059669"
                        stroke="#ffffff"
                        strokeWidth={3}
                        className="transition-all"
                      />
                      <circle cx={point.x} cy={point.y} r={16} fill="transparent" />
                      <text
                        x={point.x}
                        y={chartGeometry.height - 12}
                        textAnchor="middle"
                        className="fill-slate-600"
                        style={{ fontSize: '13px' }}
                      >
                        {point.label}
                      </text>
                    </g>
                  ))}

                  {hoveredHistoryPoint && (
                    <g pointerEvents="none">
                      {(() => {
                        const tooltipWidth = 280;
                        const tooltipHeight = 80;
                        const desiredX = hoveredHistoryPoint.x - tooltipWidth / 2;
                        const minX = chartGeometry.paddingLeft;
                        const maxX = chartGeometry.width - chartGeometry.paddingRight - tooltipWidth;
                        const tooltipX = Math.min(maxX, Math.max(minX, desiredX));
                        const tooltipY = Math.max(12, hoveredHistoryPoint.y - tooltipHeight - 16);

                        return (
                          <>
                            <rect
                              x={tooltipX}
                              y={tooltipY}
                              width={tooltipWidth}
                              height={tooltipHeight}
                              rx={12}
                              fill="#ffffff"
                              stroke="#e2e8f0"
                              strokeWidth={2}
                              style={{ filter: 'drop-shadow(0 12px 24px rgba(15, 23, 42, 0.15))' }}
                            />
                            <text x={tooltipX + 16} y={tooltipY + 32} className="fill-slate-900" style={{ fontSize: '24px', fontWeight: 700 }}>
                              {hoveredHistoryPoint.label}
                            </text>
                            <text x={tooltipX + 16} y={tooltipY + 62} className="fill-emerald-700" style={{ fontSize: '22px', fontWeight: 600 }}>
                              Ordens de Serviço: {hoveredHistoryPoint.count}
                            </text>
                          </>
                        );
                      })()}
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-900">Indicadores de Checklist Mensal</h3>
        <p className="text-slate-500">Acompanhe pendências e desempenho das inspeções.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Checklists pendentes</p>
            <AlertCircle size={18} className="text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{checklistKpis.pending}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Checklists concluídos</p>
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{checklistKpis.completed}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Concluídos hoje</p>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{checklistKpis.completedToday}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-600">Taxa de conclusão</p>
            <Timer size={18} className="text-violet-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{checklistKpis.completionRate.toFixed(0)}%</p>
        </div>
      </div>
    </Layout>
  );
}
