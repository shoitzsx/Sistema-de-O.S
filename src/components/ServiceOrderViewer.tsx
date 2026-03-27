import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Download, Clock3, ShieldCheck, FileClock, Wrench, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import { getLocalAuditLogs, isRemoteAuditEnabled } from '../lib/audit';
import { supabase } from '../lib/supabase';

interface ServiceOrder {
  id: number;
  machine_name: string;
  operator_name: string;
  operator_id?: number;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  created_at?: string;
  maintenance_type: 'preventiva' | 'corretiva';
  technician_name: string;
  description: string;
  problem_cause?: string | null;
  service_executed?: string | null;
  observations?: string | null;
  component: string;
  start_time: string;
  end_time: string | null;
  status: 'open' | 'closed';
  final_report?: string;
  used_parts_tools?: number[];
  tools?: string[];
}

interface ServiceOrderViewerProps {
  order: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
  partsTool?: Array<{ id: number; name: string; category: 'part' | 'tool' }>;
  breakMinutesAllowed?: number;
  currentBreakState?: {
    totalMs: number;
    activeStartMs: number | null;
    activeEndMs: number | null;
    pausedRemainingMs: number | null;
  } | null;
  routingMeta?: {
    assignedUserId: number | null;
    assignedUserName: string | null;
    queueStartedAt: string | null;
    workStartedAt: string | null;
  } | null;
}

interface ClosedBreakSummary {
  breakTotalMs: number | null;
  breakLimitMinutes: number | null;
  breakExceededLimit: boolean | null;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

function calculateDuration(startTime: string, endTime: string | null): string {
  try {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}min`;
  } catch {
    return '-';
  }
}

function formatDurationFromMs(durationMs?: number | null): string {
  if (!Number.isFinite(Number(durationMs))) return '-';
  const safeMs = Math.max(0, Number(durationMs || 0));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }

  return `${minutes}min ${String(seconds).padStart(2, '0')}s`;
}

function diffMs(start?: string | null, end?: string | null): number | null {
  if (!start) return null;
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, endMs - startMs);
}

function formatTimestampLabel(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function parseBreakSummary(details: Record<string, unknown> | null | undefined): ClosedBreakSummary | null {
  if (!details || typeof details !== 'object') return null;

  const breakTotalMs = Number(details.break_total_ms);
  const breakLimitMinutes = Number(details.break_limit_minutes);
  const breakExceededLimitRaw = details.break_exceeded_limit;

  const hasAny =
    Number.isFinite(breakTotalMs) ||
    Number.isFinite(breakLimitMinutes) ||
    typeof breakExceededLimitRaw === 'boolean';

  if (!hasAny) return null;

  return {
    breakTotalMs: Number.isFinite(breakTotalMs) ? breakTotalMs : null,
    breakLimitMinutes: Number.isFinite(breakLimitMinutes) ? breakLimitMinutes : null,
    breakExceededLimit:
      typeof breakExceededLimitRaw === 'boolean'
        ? breakExceededLimitRaw
        : Number.isFinite(breakTotalMs) && Number.isFinite(breakLimitMinutes)
        ? breakTotalMs > breakLimitMinutes * 60 * 1000
        : null,
  };
}

function sumLiveBreakMs(state?: {
  totalMs: number;
  activeStartMs: number | null;
  activeEndMs: number | null;
  pausedRemainingMs: number | null;
} | null): number {
  if (!state) return 0;
  const activeMs = state.activeStartMs
    ? Math.max(0, Math.min(Date.now(), state.activeEndMs || Date.now()) - state.activeStartMs)
    : 0;
  return Math.max(0, Number(state.totalMs || 0) + activeMs);
}

export default function ServiceOrderViewer({ 
  order, 
  isOpen, 
  onClose,
  partsTool = [],
  breakMinutesAllowed = 0,
  currentBreakState = null,
  routingMeta = null,
}: ServiceOrderViewerProps) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [closedBreakSummary, setClosedBreakSummary] = useState<ClosedBreakSummary | null>(null);

  if (!order) return null;

  useEffect(() => {
    if (!isOpen || !order) return;

    let active = true;

    const loadClosedBreakSummary = async () => {
      const localRows = getLocalAuditLogs()
        .filter((row) => row.action === 'service_order_closed' && row.entity_id === order.id)
        .map((row) => ({
          created_at: row.created_at,
          details: row.details,
        }));

      let mergedRows = [...localRows];

      if (isRemoteAuditEnabled()) {
        try {
          const { data, error } = await supabase
            .from('audit_logs')
            .select('entity_id, details, action, created_at')
            .eq('action', 'service_order_closed')
            .eq('entity_id', order.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (!error) {
            const remoteRows = (data || []).map((row: any) => ({
              created_at: String(row.created_at || ''),
              details: typeof row.details === 'object' && row.details ? row.details : {},
            }));

            mergedRows = [...remoteRows, ...localRows];
          }
        } catch {
          // fallback local only
        }
      }

      const summary = mergedRows
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((row) => parseBreakSummary(row.details as Record<string, unknown>))
        .find(Boolean) || null;

      if (active) {
        setClosedBreakSummary(summary);
      }
    };

    void loadClosedBreakSummary();

    return () => {
      active = false;
    };
  }, [isOpen, order]);

  const handleExportPDF = () => {
    if (!documentRef.current) return;

    const element = documentRef.current;
    const opt = {
      margin: [0, 0, 0, 0] as [number, number, number, number],
      filename: `OS_${order.id.toString().padStart(4, '0')}.pdf`,
      image: { type: 'png' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  const getMaintenanceTypeLabel = () => {
    return order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva';
  };

  const usedPartsNames = order.used_parts_tools
    ?.map(id => partsTool.find(p => p.id === id)?.name)
    .filter(Boolean) || [];

  const queueStartedAt = routingMeta?.queueStartedAt || order.created_at || null;
  const workStartedAt = routingMeta?.workStartedAt || order.start_time || null;
  const liveBreakTotalMs = useMemo(() => sumLiveBreakMs(currentBreakState), [currentBreakState]);

  const breakTotalMs = order.status === 'closed'
    ? closedBreakSummary?.breakTotalMs ?? null
    : liveBreakTotalMs;

  const breakLimitMinutes = order.status === 'closed'
    ? closedBreakSummary?.breakLimitMinutes ?? null
    : breakMinutesAllowed;

  const breakExceededLimit = order.status === 'closed'
    ? closedBreakSummary?.breakExceededLimit ?? null
    : Number.isFinite(Number(breakLimitMinutes))
    ? breakTotalMs > Number(breakLimitMinutes) * 60 * 1000
    : null;

  const queueWaitMs = queueStartedAt && workStartedAt
    ? Math.max(0, new Date(workStartedAt).getTime() - new Date(queueStartedAt).getTime())
    : null;

  const grossWorkMs = diffMs(workStartedAt || order.start_time, order.end_time);
  const effectiveWorkMs = grossWorkMs === null
    ? null
    : Math.max(0, grossWorkMs - Math.max(0, Number(breakTotalMs || 0)));

  const operationalCards = [
    {
      label: 'Abertura da O.S',
      value: formatTimestampLabel(queueStartedAt),
      detail: formatDate(queueStartedAt || undefined),
      icon: FileClock,
    },
    {
      label: 'Início do trabalho',
      value: formatTimestampLabel(workStartedAt),
      detail: queueWaitMs !== null ? `Inicio apos ${formatDurationFromMs(queueWaitMs)} em fila` : 'Sem fila registrada',
      icon: Wrench,
    },
    {
      label: 'Tempo em fila',
      value: formatDurationFromMs(queueWaitMs),
      detail:
        queueStartedAt && workStartedAt
          ? `${formatTimestampLabel(queueStartedAt)} -> ${formatTimestampLabel(workStartedAt)}`
          : 'Sem marcacao operacional',
      icon: Clock3,
    },
    {
      label: 'Trabalho efetivo',
      value: formatDurationFromMs(effectiveWorkMs),
      detail:
        grossWorkMs === null
          ? 'Sem apuracao de trabalho'
          : `Bruto: ${formatDurationFromMs(grossWorkMs)} | Intervalo: ${formatDurationFromMs(breakTotalMs)}`,
      icon: ShieldCheck,
    },
    {
      label: 'Fechamento',
      value: formatTimestampLabel(order.end_time),
      detail: order.end_time ? formatDate(order.end_time) : 'O.S em aberto',
      icon: Clock3,
    },
    {
      label: 'Controle de intervalo',
      value: formatDurationFromMs(breakTotalMs),
      detail:
        breakExceededLimit === null
          ? 'Sem apuração'
          : breakExceededLimit
          ? 'Ultrapassou o limite permitido'
          : 'Dentro do limite permitido',
      icon: ShieldCheck,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="service-order-modal-shell fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
        >
          <style>
            {`
              @media print {
                body {
                  background: #ffffff !important;
                }

                .service-order-modal-shell {
                  position: static !important;
                  inset: auto !important;
                  display: block !important;
                  background: #ffffff !important;
                  padding: 0 !important;
                  overflow: visible !important;
                }

                .service-order-modal-frame {
                  max-height: none !important;
                  max-width: none !important;
                  width: auto !important;
                  overflow: visible !important;
                  border-radius: 0 !important;
                  box-shadow: none !important;
                  background: #ffffff !important;
                }

                .service-order-modal-header,
                .service-order-screen-padding {
                  display: none !important;
                }

                .service-order-print-wrap {
                  padding: 0 !important;
                  overflow: visible !important;
                }

                .service-order-print-sheet {
                  width: 210mm !important;
                  min-height: 297mm !important;
                  margin: 0 auto !important;
                  box-shadow: none !important;
                }
              }
            `}
          </style>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="service-order-modal-frame w-full max-w-7xl max-h-[96vh] overflow-hidden flex flex-col rounded-[28px] bg-[#e8ece8] shadow-2xl"
          >
            <div className="service-order-modal-header bg-white/95 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
                  Ordem de Serviço #{order.id.toString().padStart(4, '0')}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  order.status === 'open' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {order.status === 'open' ? 'Em Andamento' : 'Finalizada'}
                </span>
                {breakExceededLimit === true && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
                    Intervalo excedido
                  </span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-medium transition-colors shadow-sm"
                  title="Imprimir documento"
                >
                  <Printer size={18} />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-medium transition-colors shadow-sm"
                  title="Exportar para PDF"
                >
                  <Download size={18} />
                  <span>Exportar PDF</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 hover:text-slate-900"
                  title="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="service-order-print-wrap flex-1 overflow-auto px-2 py-3 sm:px-6 sm:py-6">
              <div className="min-w-full flex justify-center">
                <div
                  ref={documentRef}
                  className="service-order-print-sheet bg-white shadow-[0_24px_64px_rgba(15,23,42,0.18)] text-slate-900"
                  style={{ width: '210mm', minHeight: '297mm' }}
                >
                  <div className="px-4 py-5 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
                    <div className="text-center border-b-2 border-slate-300 pb-6 mb-8">
                      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Sistema Aguia Florestal</p>
                      <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-[0.08em] text-slate-900">Ordem de Serviço</h1>
                      <p className="text-sm font-semibold text-emerald-700 mt-2">Documento operacional de manutenção</p>
                      <p className="text-xs text-slate-500 mt-2">
                    Aguia Florestal - Sistema de Gestão de Manutenção
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
                      <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.22em]">Número da O.S</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 font-mono">#{order.id.toString().padStart(4, '0')}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.22em]">Status</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{order.status === 'open' ? 'Em andamento' : 'Finalizada'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.22em]">Data de abertura</p>
                        <p className="mt-2 text-sm font-mono text-slate-900">{formatDate(queueStartedAt || order.created_at)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.22em]">Data de conclusão</p>
                        <p className="mt-2 text-sm font-mono text-slate-900">{formatDate(order.end_time)}</p>
                      </div>
                    </div>

                    <div className="mb-8 rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-300">Linha operacional</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4">
                        {operationalCards.map((card) => {
                          const Icon = card.icon;
                          return (
                            <div key={card.label} className="rounded-2xl bg-white border border-slate-200 p-4 min-h-[124px]">
                              <div className="flex items-center gap-2 text-slate-500 mb-3">
                                <Icon size={16} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.18em]">{card.label}</span>
                              </div>
                              <p className="text-lg font-bold text-slate-900 font-mono">{card.value}</p>
                              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{card.detail}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr] mb-8">
                      <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-300">Atendimento</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Solicitante / operador</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{order.operator_name || '-'}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Responsável atual</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{routingMeta?.assignedUserName || order.assigned_user_name || order.technician_name || '-'}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Situação atual</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{order.status === 'open' ? 'Em andamento' : 'Finalizada'}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Horas trabalhadas</label>
                            <p className="text-sm font-medium text-slate-900 mt-1 font-mono">{calculateDuration(order.start_time, order.end_time)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-300">Controle de intervalo</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Tempo total</label>
                            <p className="text-sm font-medium text-slate-900 mt-1 font-mono">{formatDurationFromMs(breakTotalMs)}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Limite previsto</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{breakLimitMinutes ? `${breakLimitMinutes} min` : '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Resultado</label>
                            <p className={`text-sm font-semibold mt-1 ${breakExceededLimit ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {breakExceededLimit === null
                                ? 'Sem informação consolidada'
                                : breakExceededLimit
                                ? 'Sim, o intervalo ultrapassou o limite.'
                                : 'Não, o intervalo permaneceu dentro do limite.'}
                            </p>
                            {breakExceededLimit === true && (
                              <div className="mt-3 inline-flex items-center rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
                                Alerta operacional: limite de intervalo excedido
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 mb-8">
                      <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-300">Equipamento</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">ID do equipamento</label>
                            <p className="text-sm font-medium text-slate-900 mt-1 font-mono">{order.id}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Nome do equipamento</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{order.machine_name}</p>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Componente</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{order.component || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-300">Manutenção</h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Tipo</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{getMaintenanceTypeLabel()}</p>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Prioridade</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{order.maintenance_type === 'corretiva' ? 'Alta / corretiva' : 'Programada / preventiva'}</p>
                          </div>
                          <div className="col-span-2">
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Técnico responsável</label>
                            <p className="text-sm font-medium text-slate-900 mt-1">{order.technician_name || routingMeta?.assignedUserName || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8 rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-3 pb-2 border-b border-slate-300">Problema / Solicitação</h2>
                      <div className="bg-white border border-slate-200 border-l-[5px] border-l-emerald-700 p-5 rounded-xl min-h-[132px] text-sm text-slate-800 leading-7">
                        {order.problem_cause || order.description || '-'}
                      </div>
                    </div>

                    {(usedPartsNames.length > 0 || (order.tools || []).length > 0) && (
                      <div className="mb-8 rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-300">Recursos aplicados</h2>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Peças / itens cadastrados</label>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {usedPartsNames.length > 0 ? usedPartsNames.map((name, idx) => (
                                <span key={idx} className="bg-white px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700">
                                  {name}
                                </span>
                              )) : <span className="text-sm text-slate-500">Nenhum item registrado</span>}
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em]">Ferramentas informadas</label>
                            <div className="flex flex-wrap gap-2 mt-3">
                              {(order.tools || []).length > 0 ? (order.tools || []).map((tool, idx) => (
                                <span key={`${tool}-${idx}`} className="bg-white px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700">
                                  {tool}
                                </span>
                              )) : <span className="text-sm text-slate-500">Nenhuma ferramenta informada</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-8 rounded-2xl border border-slate-200 p-5 sm:p-6 bg-slate-50">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.2em] mb-3 pb-2 border-b border-slate-300">Fechamento técnico</h2>
                      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 min-h-[148px] space-y-5">
                        <div>
                          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-2">Serviço executado</p>
                          {order.service_executed || order.final_report ? (
                            <p className="text-sm text-slate-800 leading-7 whitespace-pre-wrap">{order.service_executed || order.final_report}</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Nenhum serviço executado registrado.</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.14em] mb-2">Observações</p>
                          {order.observations ? (
                            <p className="text-sm text-slate-800 leading-7 whitespace-pre-wrap">{order.observations}</p>
                          ) : (
                            <p className="text-sm text-slate-400 italic">Nenhuma observação registrada.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 pt-8 border-t-2 border-slate-300">
                      <div className="grid grid-cols-2 gap-8">
                        <div className="text-center">
                          <div className="h-16 border-b border-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Solicitante / Gestão</p>
                        </div>
                        <div className="text-center">
                          <div className="h-16 border-b border-slate-400 mb-2" />
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Técnico / Operador</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                      <p className="text-xs text-slate-400">Documento gerado automaticamente pelo Sistema Aguia Florestal</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
