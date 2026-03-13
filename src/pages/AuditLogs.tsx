import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocalAuditLogs, isRemoteAuditEnabled, type LocalAuditLogEntry } from '../lib/audit';

interface AuditLogRow {
  id: number | string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: Record<string, unknown>;
  user_id: number | null;
  user_name: string;
  user_role: string;
  created_at: string;
  sync_status?: 'synced' | 'local-only';
}

const PAGE_SIZE = 25;

const actionLabels: Record<string, string> = {
  service_order_created: 'O.S criada',
  service_order_updated: 'O.S atualizada',
  service_order_closed: 'O.S finalizada',
  service_order_deleted: 'O.S excluída',
};

const maintenanceTypeLabels: Record<string, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
};

const fieldLabels: Record<string, string> = {
  final_report: 'relatório final',
  tools: 'ferramentas',
  component: 'componente',
};

const entityTypeLabels: Record<string, string> = {
  service_orders: 'Ordem de serviço',
};

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const formatAuditDetails = (row: AuditLogRow): string => {
  const details = row.details || {};

  if (row.action === 'service_order_created') {
    const machineName = asText(details.machine_name);
    const component = asText(details.component);
    const maintenanceType = maintenanceTypeLabels[asText(details.maintenance_type)] || '';
    const parts = [
      machineName ? `Máquina: ${machineName}` : '',
      component ? `Componente: ${component}` : '',
      maintenanceType ? `Tipo: ${maintenanceType}` : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' | ') : 'Nova O.S registrada.';
  }

  if (row.action === 'service_order_updated') {
    const fields = Array.isArray(details.fields) ? details.fields : [];
    const normalized = fields
      .map((field) => fieldLabels[asText(field)] || asText(field))
      .filter(Boolean);

    return normalized.length > 0
      ? `Campos atualizados: ${normalized.join(', ')}`
      : 'Dados da O.S atualizados.';
  }

  if (row.action === 'service_order_closed') {
    const closedVia = asText(details.closed_via);
    const hasFinalReport = Boolean(details.has_final_report);
    const viaText = closedVia === 'quick-action' ? 'Finalizada por ação rápida.' : 'O.S finalizada.';

    return hasFinalReport
      ? `${viaText} Relatório final informado.`
      : `${viaText} Sem relatório final.`;
  }

  if (row.action === 'service_order_deleted') {
    const mode = asText(details.mode);
    const selectedIds = Array.isArray(details.selected_ids) ? details.selected_ids : [];
    const reason = asText(details.reason);

    const modeText = mode === 'all'
      ? 'Exclusão de todas as O.S.'
      : `Exclusão seletiva (${selectedIds.length} O.S).`;

    return reason ? `${modeText} Motivo: ${reason}` : modeText;
  }

  return 'Ação registrada.';
};

export default function AuditLogs() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'service_order_created' | 'service_order_updated' | 'service_order_closed' | 'service_order_deleted'>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    void loadLogs();
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, actionFilter, userFilter, dateFrom, dateTo]);

  const loadLogs = async () => {
    const localRows = getLocalAuditLogs().map((row) => ({
      id: row.id,
      action: row.action,
      entity_type: 'service_orders',
      entity_id: row.entity_id,
      details: row.details,
      user_id: row.user_id,
      user_name: row.user_name,
      user_role: row.user_role,
      created_at: row.created_at,
      sync_status: row.sync_status,
    }));

    if (!isRemoteAuditEnabled()) {
      setRows(localRows);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        setRows(localRows);
        return;
      }

      const remoteRows: AuditLogRow[] = (data || []).map((row: any) => ({
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        details: typeof row.details === 'object' && row.details ? row.details : {},
        user_id: row.user_id,
        user_name: row.user_name || 'N/D',
        user_role: row.user_role || 'N/D',
        created_at: row.created_at,
        sync_status: 'synced',
      }));

      const merged = [...remoteRows, ...localRows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 1500);

      setRows(merged);
    } catch {
      setRows(localRows);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (actionFilter !== 'all' && row.action !== actionFilter) return false;
      if (userFilter !== 'all' && row.user_name !== userFilter) return false;

      if (dateFrom) {
        const start = new Date(`${dateFrom}T00:00:00`).getTime();
        if (new Date(row.created_at).getTime() < start) return false;
      }

      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59`).getTime();
        if (new Date(row.created_at).getTime() > end) return false;
      }

      if (!query.trim()) return true;

      const q = query.toLowerCase();
      const detailText = formatAuditDetails(row).toLowerCase();
      return (
        String(row.entity_id || '').includes(q) ||
        row.user_name.toLowerCase().includes(q) ||
        (actionLabels[row.action] || row.action).toLowerCase().includes(q) ||
        detailText.includes(q)
      );
    });
  }, [rows, actionFilter, userFilter, dateFrom, dateTo, query]);

  const visibleRows = useMemo(() => filteredRows.slice(0, visibleCount), [filteredRows, visibleCount]);

  const uniqueUsers = useMemo(() => {
    const names = rows.map((row) => String(row.user_name || 'N/D'));
    return Array.from(new Set<string>(names)).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const formatDate = (value: string) => {
    return new Date(value).toLocaleString('pt-BR');
  };

  const exportCsv = () => {
    const headers = ['Data', 'Ação', 'Usuário', 'Perfil', 'Entidade', 'ID Entidade', 'Detalhes', 'Sincronização'];
    const lines = filteredRows.map((row) => [
      formatDate(row.created_at),
      actionLabels[row.action] || row.action,
      row.user_name,
      row.user_role,
      entityTypeLabels[row.entity_type] || row.entity_type,
      row.entity_id ?? '-',
      formatAuditDetails(row),
      row.sync_status || 'synced',
    ]);

    const csv = [headers, ...lines]
      .map((fields) =>
        fields
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(';')
      )
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-os-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'administrador' || String(user?.username || '').trim().toLowerCase() === 'admin';

  if (!isAdmin) {
    return (
      <Layout>
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">Somente administradores podem visualizar os registros de auditoria.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={24} className="text-emerald-600" /> Auditoria de Ações
            </h2>
            <p className="text-slate-500">Registros de criar, editar, finalizar e excluir O.S.</p>
          </div>
          <button
            onClick={exportCsv}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2"
          >
            <Download size={17} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Busca</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Usuário, ação, detalhes, ID"
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ação</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as typeof actionFilter)}
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          >
            <option value="all">Todas</option>
            <option value="service_order_created">O.S criada</option>
            <option value="service_order_updated">O.S atualizada</option>
            <option value="service_order_closed">O.S finalizada</option>
            <option value="service_order_deleted">O.S excluída</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Usuário</label>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          >
            <option value="all">Todos</option>
            {uniqueUsers.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data inicial</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data final</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-5">
          <button
            onClick={() => {
              setQuery('');
              setActionFilter('all');
              setUserFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            <Filter size={16} /> Limpar filtros
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Data</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Ação</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Usuário</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">OS</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Detalhes</th>
                <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Sync</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.id}`} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 font-medium">{actionLabels[row.action] || row.action}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{row.user_name}</div>
                    <div className="text-xs text-slate-500">{row.user_role}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.entity_id ? `#${String(row.entity_id).padStart(4, '0')}` : '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{formatAuditDetails(row)}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-1 rounded-full ${row.sync_status === 'local-only' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {row.sync_status === 'local-only' ? 'local' : 'sincronizado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {visibleRows.length === 0 && (
          <div className="p-10 text-center text-slate-500">Nenhum registro encontrado com os filtros atuais.</div>
        )}
      </div>

      {filteredRows.length > visibleCount && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
          >
            Carregar mais ({filteredRows.length - visibleCount} restantes)
          </button>
        </div>
      )}
    </Layout>
  );
}
