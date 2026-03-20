import React, { useRef } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2pdf from 'html2pdf.js';

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

export default function ServiceOrderViewer({ 
  order, 
  isOpen, 
  onClose,
  partsTool = []
}: ServiceOrderViewerProps) {
  const documentRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handleExportPDF = () => {
    if (!documentRef.current) return;

    const element = documentRef.current;
    const opt = {
      margin: 0,
      filename: `OS_${order.id.toString().padStart(4, '0')}.pdf`,
      image: { type: 'png' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  const getMaintenanceTypeLabel = () => {
    return order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva';
  };

  const getStatusColor = () => {
    return order.status === 'open' ? 'em andamento' : 'finalizada';
  };

  const usedPartsNames = order.used_parts_tools
    ?.map(id => partsTool.find(p => p.id === id)?.name)
    .filter(Boolean) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-slate-100 rounded-2xl shadow-2xl"
          >
            {/* Header with Action Buttons */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  Ordem de Serviço #{order.id.toString().padStart(4, '0')}
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  order.status === 'open' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  {order.status === 'open' ? 'Em Andamento' : 'Finalizada'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                  title="Exportar para PDF"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                  title="Fechar"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Document Container */}
            <div className="flex-1 overflow-y-auto p-6">
              <div
                ref={documentRef}
                className="w-full bg-white rounded-lg shadow-lg p-12"
                style={{ minHeight: '1200px', aspectRatio: '210/297' }}
              >
                {/* Document Header */}
                <div className="text-center border-b-2 border-slate-300 pb-6 mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">ORDEM DE SERVIÇO</h1>
                  <p className="text-sm font-semibold text-emerald-600">Documento Operacional de Manutenção</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Aguia Florestal - Sistema de Gestão de Manutenção
                  </p>
                </div>

                {/* Identification Section */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">
                  <div className="border-l-4 border-emerald-600 pl-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Número da OS</label>
                    <p className="text-2xl font-bold text-slate-900 font-mono">
                      #{order.id.toString().padStart(4, '0')}
                    </p>
                  </div>
                  <div className="border-l-4 border-slate-300 pl-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                    <p className="text-lg font-bold text-slate-900">
                      {order.status === 'open' ? 'Em Andamento' : 'Finalizada'}
                    </p>
                  </div>
                  <div className="border-l-4 border-slate-300 pl-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data de Abertura</label>
                    <p className="text-sm font-mono text-slate-900">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="border-l-4 border-slate-300 pl-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data de Conclusão</label>
                    <p className="text-sm font-mono text-slate-900">{formatDate(order.end_time)}</p>
                  </div>
                </div>

                {/* Attendance Section */}
                <div className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                    Atendimento
                  </h2>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Operador Responsável</label>
                      <p className="text-sm font-medium text-slate-900 mt-1">{order.operator_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Situação Atual</label>
                      <p className="text-sm font-medium text-slate-900 mt-1">
                        {order.status === 'open' ? 'Em andamento' : 'Finalizada'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Horas Trabalhadas</label>
                      <p className="text-sm font-medium text-slate-900 mt-1 font-mono">
                        {calculateDuration(order.start_time, order.end_time)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Equipment Section */}
                <div className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                    Equipamento
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Componente</label>
                      <p className="text-sm font-medium text-slate-900 mt-1">{order.component || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Nome do Equipamento</label>
                      <p className="text-sm font-medium text-slate-900 mt-1">{order.machine_name}</p>
                    </div>
                  </div>
                </div>

                {/* Maintenance Section */}
                <div className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                    Informações de Manutenção
                  </h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Tipo de Manutenção</label>
                      <p className="text-sm font-medium text-slate-900 mt-1">{getMaintenanceTypeLabel()}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Técnico Responsável</label>
                      <p className="text-sm font-medium text-slate-900 mt-1">{order.technician_name || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Problem/Request Section */}
                <div className="mb-8">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3 pb-2 border-b border-slate-300">
                    Problema / Solicitação
                  </h2>
                  <div className="bg-white border-l-4 border-emerald-600 p-5 rounded min-h-[120px] text-sm text-slate-800 leading-relaxed">
                    {order.description || '-'}
                  </div>
                </div>

                {/* Used Parts/Tools Section */}
                {usedPartsNames.length > 0 && (
                  <div className="mb-8 bg-slate-50 p-6 rounded-lg border border-slate-200">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-300">
                      Itens Utilizados
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {usedPartsNames.map((name, idx) => (
                        <span key={idx} className="bg-white px-3 py-2 rounded border border-slate-300 text-xs font-medium text-slate-700">
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
                  <div className="bg-white border border-slate-200 rounded p-5 min-h-[100px]">
                    {order.final_report ? (
                      <p className="text-sm text-slate-800 leading-relaxed">{order.final_report}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Nenhuma observação registrada</p>
                    )}
                  </div>
                </div>

                {/* Signature Section */}
                <div className="mt-12 pt-8 border-t-2 border-slate-300">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-center">
                      <div className="h-16 border-b border-slate-400 mb-2"></div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Solicitante / Gestão</p>
                    </div>
                    <div className="text-center">
                      <div className="h-16 border-b border-slate-400 mb-2"></div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Técnico / Operador</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                  <p className="text-xs text-slate-400">
                    Documento gerado automaticamente pelo Sistema Aguia Florestal
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
