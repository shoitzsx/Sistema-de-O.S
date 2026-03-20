import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';
import brandLogo from '../../logo/logo.png';

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
    breakState?: {
        totalMs: number;
        activeStartMs: number | null;
        activeEndMs: number | null;
        pausedRemainingMs: number | null;
    };
    breakLimitMinutes?: number;
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

function formatTime(dateString?: string): string {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
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
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } catch {
        return '-';
    }
}

function formatBreakTime(breakMs: number): string {
    const hours = Math.floor(breakMs / (1000 * 60 * 60));
    const mins = Math.floor((breakMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
}

export default function ServiceOrderViewer({
    order,
    isOpen,
    onClose,
    partsTool = [],
    breakState,
    breakLimitMinutes = 15
}: ServiceOrderViewerProps) {
    const documentRef = useRef<HTMLDivElement>(null);

    if (!order) return null;

    const handleExportPDF = () => {
        if (!documentRef.current) return;

        const element = documentRef.current;
        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `OS_${order.id.toString().padStart(4, '0')}_${new Date().toISOString().slice(0, 10)}.pdf`,
            image: { type: 'png' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(element).save();
    };

    const getMaintenanceTypeLabel = () => {
        return order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva';
    };

    const usedPartsNames = order.used_parts_tools
        ?.map(id => partsTool.find(p => p.id === id)?.name)
        .filter(Boolean) || [];

    const totalBreakMs = breakState?.totalMs || 0;
    const breakLimitMs = breakLimitMinutes * 60 * 1000;
    const exceeded = totalBreakMs > breakLimitMs;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-100 rounded-2xl shadow-2xl"
                    >
                        {/* Header with Action Buttons */}
                        <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                                    OS #{order.id.toString().padStart(4, '0')}
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide w-fit ${order.status === 'open'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                    {order.status === 'open' ? 'Em Andamento' : 'Finalizada'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportPDF}
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm sm:text-base"
                                    title="Exportar para PDF"
                                >
                                    <Download size={16} />
                                    <span className="hidden sm:inline">PDF</span>
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                                    title="Fechar"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Document Container */}
                        <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-slate-100">
                            <div
                                ref={documentRef}
                                className="relative isolate w-full overflow-hidden bg-white rounded-lg shadow-lg p-6 sm:p-12"
                                style={{ minHeight: '1200px' }}
                            >
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]">
                                    <img
                                        src={brandLogo}
                                        alt=""
                                        aria-hidden="true"
                                        className="w-[78%] max-w-[560px] h-auto"
                                    />
                                </div>
                                <div className="relative z-10">
                                <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                    <span>Centro de Manutencao Aguia Florestal</span>
                                    <span>Documento tecnico controlado</span>
                                </div>
                                {/* Document Header with Logo */}
                                <div className="text-center border-b-2 border-slate-300 pb-6 mb-8">
                                    <div className="mb-5 flex justify-center">
                                        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                                            <img
                                                src={brandLogo}
                                                alt="Águia Florestal"
                                                className="h-20 sm:h-24 w-auto"
                                            />
                                        </div>
                                    </div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-1">ORDEM DE SERVIÇO</h1>
                                    <p className="text-sm font-semibold text-emerald-600">Documento Operacional de Manutenção</p>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Aguia Florestal - Sistema de Gestão de Manutenção
                                    </p>
                                    <div className="mt-4 grid grid-cols-3 gap-3 text-left text-[11px] text-slate-500">
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="font-semibold text-slate-700">Codigo</p>
                                            <p>OS-{order.id.toString().padStart(4, '0')}</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="font-semibold text-slate-700">Emissao</p>
                                            <p>{formatDate(order.created_at)}</p>
                                        </div>
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                            <p className="font-semibold text-slate-700">Gerado em</p>
                                            <p>{formatDate(new Date().toISOString())}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Identification Section */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                                    <div className="border-l-4 border-emerald-600 pl-3 sm:pl-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Número</label>
                                        <p className="text-lg sm:text-2xl font-bold text-slate-900 font-mono break-all">
                                            #{order.id.toString().padStart(4, '0')}
                                        </p>
                                    </div>
                                    <div className="border-l-4 border-slate-300 pl-3 sm:pl-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                                        <p className="text-sm sm:text-lg font-bold text-slate-900">
                                            {order.status === 'open' ? 'Aberta' : 'Fechada'}
                                        </p>
                                    </div>
                                    <div className="border-l-4 border-slate-300 pl-3 sm:pl-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                                        <p className="text-sm sm:text-lg font-bold text-slate-900">{getMaintenanceTypeLabel()}</p>
                                    </div>
                                    <div className="border-l-4 border-slate-300 pl-3 sm:pl-4">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prioridade</label>
                                        <p className="text-sm sm:text-lg font-bold text-slate-900">
                                            {order.maintenance_type === 'corretiva' ? 'Alta' : 'Normal'}
                                        </p>
                                    </div>
                                </div>

                                {/* Timeline Section */}
                                <div className="mb-8 bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                                        Cronograma
                                    </h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Aberta em</label>
                                            <p className="text-xs sm:text-sm font-mono text-slate-900 mt-1">{formatDate(order.created_at)}</p>
                                            <p className="text-xs text-slate-500">às {formatTime(order.created_at)}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Trabalho iniciado</label>
                                            <p className="text-xs sm:text-sm font-mono text-slate-900 mt-1">{formatTime(order.start_time)}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Fechada em</label>
                                            <p className="text-xs sm:text-sm font-mono text-slate-900 mt-1">{order.end_time ? formatDate(order.end_time) : 'Pendente'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Duração total</label>
                                            <p className="text-xs sm:text-sm font-mono font-bold text-emerald-700 mt-1">{calculateDuration(order.start_time, order.end_time)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Break Information */}
                                {breakState && (
                                    <div className={`mb-8 p-4 sm:p-6 rounded-lg border-2 ${exceeded ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                                            ⏱️ Tempo de Intervalo
                                        </h2>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700">Total utilizado</label>
                                                <p className={`text-sm sm:text-base font-bold mt-1 ${exceeded ? 'text-red-700' : 'text-amber-700'}`}>
                                                    {formatBreakTime(totalBreakMs)}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700">Limite permitido</label>
                                                <p className="text-sm sm:text-base font-bold text-slate-700 mt-1">{breakLimitMinutes} minutos</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-700">Status</label>
                                                <p className={`text-sm sm:text-base font-bold mt-1 ${exceeded ? 'text-red-700' : 'text-green-700'}`}>
                                                    {exceeded ? '⚠️ ULTRAPASSADO' : '✓ Dentro limite'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Attendance Section */}
                                <div className="mb-8 bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                                        Atendimento
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Operador Responsável</label>
                                            <p className="text-sm font-medium text-slate-900 mt-1">{order.operator_name || '-'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Técnico Atribuído</label>
                                            <p className="text-sm font-medium text-slate-900 mt-1">{order.assigned_user_name || order.technician_name || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Equipment Section */}
                                <div className="mb-8 bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                                        Equipamento
                                    </h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Máquina</label>
                                            <p className="text-sm font-medium text-slate-900 mt-1">{order.machine_name}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Componente</label>
                                            <p className="text-sm font-medium text-slate-900 mt-1">{order.component || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Problem/Request Section */}
                                <div className="mb-8">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2 border-b border-slate-300">
                                        Problema / Solicitação
                                    </h2>
                                    <div className="bg-white border-l-4 border-emerald-600 p-4 sm:p-5 rounded min-h-[100px] text-xs sm:text-sm text-slate-800 leading-relaxed">
                                        {order.description || '-'}
                                    </div>
                                </div>

                                {/* Used Parts/Tools Section */}
                                {usedPartsNames.length > 0 && (
                                    <div className="mb-8 bg-slate-50 p-4 sm:p-6 rounded-lg border border-slate-200">
                                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                                            Itens Utilizados
                                        </h2>
                                        <div className="flex flex-wrap gap-2">
                                            {usedPartsNames.map((name, idx) => (
                                                <span key={idx} className="bg-white px-2 sm:px-3 py-1 rounded border border-slate-300 text-xs font-medium text-slate-700">
                                                    {name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Technical Notes Section */}
                                <div className="mb-8">
                                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2 border-b border-slate-300">
                                        Observações Técnicas
                                    </h2>
                                    <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 min-h-[80px]">
                                        {order.final_report ? (
                                            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{order.final_report}</p>
                                        ) : (
                                            <p className="text-xs sm:text-sm text-slate-400 italic">Nenhuma observação registrada</p>
                                        )}
                                    </div>
                                </div>

                                {/* Signature Section */}
                                <div className="mt-12 pt-8 border-t-2 border-slate-300">
                                    <div className="grid grid-cols-2 gap-6 sm:gap-8">
                                        <div className="text-center">
                                            <div className="h-12 border-b border-slate-400 mb-2"></div>
                                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Solicitante / Gestão</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="h-12 border-b border-slate-400 mb-2"></div>
                                            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Técnico / Operador</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-8 pt-4 border-t border-slate-300">
                                    <div className="flex items-end justify-between gap-4 text-[11px] text-slate-500">
                                        <div>
                                            <p className="font-semibold uppercase tracking-[0.18em] text-slate-700">Aguia Florestal PCM</p>
                                            <p>Documento gerado automaticamente pelo sistema corporativo de manutencao.</p>
                                        </div>
                                        <div className="text-right">
                                            <p>Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
                                            <p>{new Date().toLocaleTimeString('pt-BR')}</p>
                                        </div>
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
