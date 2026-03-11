import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getChecklists, getMachines } from '../lib/supabaseApi';

interface ChecklistItem {
  status: 'ok' | 'nok' | 'na' | null;
  observation: string;
}

interface Machine {
  id: number;
  name: string;
  model: string;
}

interface InspectionHistoryItem {
  id: number;
  machine: string;
  machine_id: number;
  operator_id: number;
  date: Date;
  dateFormatted: string;
  data: Record<string, ChecklistItem>;
}

function toSafeDate(value: unknown): Date {
  const parsed = new Date(typeof value === 'string' && value ? value : Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toChecklistObject(value: unknown): Record<string, ChecklistItem> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, ChecklistItem>;
  }
  return {};
}

export default function ChecklistHistory() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const normalizedUsername = String(user?.username || '').trim().toLowerCase();
  const isAdmin =
    normalizedRole === 'admin' ||
    normalizedRole === 'administrador' ||
    normalizedUsername === 'admin';

  const [machines, setMachines] = useState<Machine[]>([]);
  const [inspectionHistory, setInspectionHistory] = useState<InspectionHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterMachine, setFilterMachine] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [machinesData, checklistsData] = await Promise.all([getMachines(), getChecklists()]);
      setMachines(machinesData || []);

      const machineNameMap = new Map<number, string>((machinesData || []).map((m: Machine) => [m.id, m.name]));
      const visibleChecklists = (checklistsData || []).filter((insp: any) => {
        if (isAdmin) return true;
        return insp.operator_id === user?.id;
      });

      const mappedHistory = visibleChecklists.map((insp: any) => {
        let parsedData = {};
        try {
          parsedData = typeof insp.data === 'string' ? JSON.parse(insp.data) : (insp.data || {});
        } catch {
          parsedData = {};
        }

        const inspectionDate = toSafeDate(insp.date || insp.created_at);

        return {
          id: insp.id,
          machine: machineNameMap.get(insp.machine_id) || `Máquina ${insp.machine_id}`,
          machine_id: insp.machine_id,
          operator_id: insp.operator_id,
          date: inspectionDate,
          dateFormatted: inspectionDate.toLocaleString('pt-BR'),
          data: toChecklistObject(parsedData)
        };
      });

      setInspectionHistory(mappedHistory);
    } catch (err) {
      console.error('Erro ao carregar histórico de checklists:', err);
      toast.error('Erro ao carregar histórico de inspeções');
    }
  };

  const filteredHistory = useMemo(() => {
    const filtered = inspectionHistory.filter(insp => {
      const dateIso = toSafeDate(insp.date).toISOString().split('T')[0];
      const matchDate = !filterDate || dateIso === filterDate;
      const matchMachine = !filterMachine || String(insp.machine_id ?? '') === filterMachine;
      const matchSearch =
        !searchTerm ||
        insp.machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(insp.id).includes(searchTerm) ||
        (isAdmin && String(insp.operator_id).includes(searchTerm));

      return matchDate && matchMachine && matchSearch;
    });

    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [inspectionHistory, filterDate, filterMachine, searchTerm, isAdmin]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Histórico de Inspeção de Checklist</h2>
            <p className="text-slate-500">
              {isAdmin ? 'Todas as inspeções realizadas no sistema' : 'Suas inspeções realizadas'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder={isAdmin ? 'Máquina, ID, operador...' : 'Máquina ou ID da inspeção...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Máquina</label>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
            >
              <option value="">Todas as máquinas</option>
              {machines.map(machine => (
                <option key={machine.id} value={String(machine.id)}>
                  {machine.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterDate('');
                setFilterMachine('');
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          <ul className="space-y-4">
            {filteredHistory.map((insp, idx) => (
              <li key={`${insp.id ?? 'noid'}-${idx}`} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-900">{insp.machine}</div>
                    <div className="text-sm text-slate-500">Data: {insp.dateFormatted}</div>
                    {isAdmin && (
                      <div className="text-xs text-slate-500 mt-1">Operador ID: {insp.operator_id}</div>
                    )}
                  </div>
                  <div className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle size={14} /> Concluído
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-emerald-600 font-semibold hover:text-emerald-700 transition-colors select-none">
                    Ver itens inspecionados
                  </summary>
                  <ul className="mt-3 space-y-2 ml-2">
                    {Object.entries(toChecklistObject(insp.data)).map(([item, val]) => {
                      const status = val?.status ?? null;
                      const observation = val?.observation ?? '';

                      return (
                        <li key={item} className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-block w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                status === 'ok' ? 'bg-emerald-500' : status === 'nok' ? 'bg-red-500' : 'bg-slate-400'
                              }`}
                            >
                              {typeof status === 'string' ? status.charAt(0).toUpperCase() : '-'}
                            </span>
                            <span className="font-medium text-slate-900">{item}</span>
                          </div>
                          {observation && (
                            <div className="ml-8 text-xs text-slate-600 italic border-l-2 border-amber-300 pl-2">
                              Observação: {observation}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <p className="text-sm">Nenhuma inspeção encontrada para os filtros aplicados</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
