import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, CheckCircle, FileText, Download, BookmarkPlus, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';
import {
  getServiceOrders,
  deleteServiceOrdersByScope,
  deleteServiceOrdersByIds,
  verifyUserCredentials,
} from '../lib/supabaseApi';
import { recordAuditAction } from '../lib/audit';

interface SavedHistoryFilter {
  id: string;
  name: string;
  searchTerm: string;
  filterStatus: 'all' | 'open' | 'closed';
  filterType: 'all' | 'preventiva' | 'corretiva';
  dateFrom: string;
  dateTo: string;
}

interface ServiceOrder {
  id: number;
  machine_name: string;
  operator_name: string;
  operator_id: number;
  maintenance_type: 'preventiva' | 'corretiva';
  technician_name: string;
  description: string;
  tools: string[];
  used_parts_tools?: number[];
  component: string;
  start_time: string;
  end_time: string | null;
  status: 'open' | 'closed';
  final_report?: string;
}

export default function History() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const normalizedUsername = String(user?.username || '').trim().toLowerCase();
  const isAdmin =
    normalizedRole === 'admin' ||
    normalizedRole === 'administrador' ||
    normalizedUsername === 'admin';
  const PAGE_SIZE = 20;
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('closed');
  const [filterType, setFilterType] = useState<'all' | 'preventiva' | 'corretiva'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [savedFilters, setSavedFilters] = useState<SavedHistoryFilter[]>([]);
  const [savedFilterName, setSavedFilterName] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isDeletingAllOrders, setIsDeletingAllOrders] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'specific'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    void fetchOrders();
  }, [user?.id, isAdmin]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filterStatus, filterType, searchTerm, dateFrom, dateTo, user]);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(`history-filters:${user.id}`);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedFilters(parsed as SavedHistoryFilter[]);
      }
    } catch {
      setSavedFilters([]);
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const data = await getServiceOrders();
      const scopedOrders = isAdmin
        ? data
        : data.filter((order) => order.operator_id === user?.id);
      setOrders(scopedOrders);
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filter por role: admin vê tudo, operador vê só seu
    if (!isAdmin) {
      filtered = filtered.filter(order => order.operator_id === user?.id);
    }

    // Filter por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    // Filter por tipo de manutenção
    if (filterType !== 'all') {
      filtered = filtered.filter(order => order.maintenance_type === filterType);
    }

    // Filter por busca
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.technician_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm)
      );
    }

    if (dateFrom) {
      const start = new Date(`${dateFrom}T00:00:00`).getTime();
      filtered = filtered.filter((order) => new Date(order.start_time).getTime() >= start);
    }

    if (dateTo) {
      const end = new Date(`${dateTo}T23:59:59`).getTime();
      filtered = filtered.filter((order) => new Date(order.start_time).getTime() <= end);
    }

    // Ordenar por data mais recente primeiro
    filtered.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return filtered;
  }, [orders, filterStatus, filterType, searchTerm, dateFrom, dateTo, user, isAdmin]);

  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount);
  }, [filteredOrders, visibleCount]);

  const saveCurrentFilter = () => {
    if (!user) return;
    const name = savedFilterName.trim();
    if (!name) {
      toast.error('Dê um nome para salvar o filtro.');
      return;
    }

    const next: SavedHistoryFilter[] = [
      {
        id: `hf_${Date.now()}`,
        name,
        searchTerm,
        filterStatus,
        filterType,
        dateFrom,
        dateTo,
      },
      ...savedFilters,
    ].slice(0, 10);

    setSavedFilters(next);
    setSavedFilterName('');
    localStorage.setItem(`history-filters:${user.id}`, JSON.stringify(next));
    toast.success('Filtro salvo com sucesso.');
  };

  const applySavedFilter = (filter: SavedHistoryFilter) => {
    setSearchTerm(filter.searchTerm);
    setFilterStatus(filter.filterStatus);
    setFilterType(filter.filterType);
    setDateFrom(filter.dateFrom);
    setDateTo(filter.dateTo);
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = endTime - startTime;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const escapeCsvField = (value: string) => {
    const normalized = String(value ?? '').replace(/\r?\n/g, ' ');
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Máquina', 'Operador', 'Responsável', 'Tipo', 'Componente', 'Início', 'Início ISO', 'Fim', 'Fim ISO', 'Duração', 'Status', 'Relatório'];
    const csvContent = [
      headers.map(escapeCsvField).join(';'),
      ...filteredOrders.map(order => [
        `#${order.id.toString().padStart(4, '0')}`,
        order.machine_name,
        order.operator_name,
        order.technician_name,
        order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva',
        order.component,
        formatDate(order.start_time),
        order.start_time,
        order.end_time ? formatDate(order.end_time) : '-',
        order.end_time || '-',
        calculateDuration(order.start_time, order.end_time),
        order.status === 'closed' ? 'Finalizada' : 'Em Andamento',
        order.final_report || '-'
      ].map(field => escapeCsvField(field)).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-os-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const rowsHtml = filteredOrders.map((order) => `
      <tr>
        <td>#${order.id.toString().padStart(4, '0')}</td>
        <td>${order.machine_name}</td>
        <td>${order.technician_name}</td>
        <td>${order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva'}</td>
        <td>${order.status === 'closed' ? 'Finalizada' : 'Em andamento'}</td>
        <td>${formatDate(order.start_time)}</td>
        <td>${order.end_time ? formatDate(order.end_time) : '-'}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio de OS</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            p { margin: 0 0 20px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>Relatório de Ordens de Serviço</h1>
          <p>Gerado em ${new Date().toLocaleString('pt-BR')} | Registros: ${filteredOrders.length}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Máquina</th>
                <th>Responsável</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Início</th>
                <th>Fim</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a visualização do PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const openDeleteModal = () => {
    setDeleteMode('all');
    setSelectedOrderIds([]);
    setDeleteReason('');
    setAdminPassword('');
    setIsDeleteConfirmOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteContinue = () => {
    if (!deleteReason.trim()) {
      toast.error('❌ Informe o motivo da exclusão.');
      return;
    }

    if (!adminPassword.trim()) {
      toast.error('❌ Informe a senha de admin.');
      return;
    }

    if (deleteMode === 'specific' && selectedOrderIds.length === 0) {
      toast.error('❌ Selecione pelo menos uma O.S para excluir.');
      return;
    }

    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteOrders = async () => {
    if (!isAdmin || !user?.username) return;

    try {
      setIsDeletingAllOrders(true);

      const validCredentials = await verifyUserCredentials(user.username, adminPassword, 'admin');
      if (!validCredentials) {
        toast.error('❌ Senha de admin inválida.');
        return;
      }

      const success =
        deleteMode === 'all'
          ? await deleteServiceOrdersByScope('all')
          : await deleteServiceOrdersByIds(selectedOrderIds);

      if (success) {
        await recordAuditAction({
          action: 'service_order_deleted',
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
          details: {
            mode: deleteMode,
            selected_ids: deleteMode === 'specific' ? selectedOrderIds : [],
            reason: deleteReason,
          },
        });

        toast.success('✅ Ordens de serviço excluídas com sucesso.');
        await fetchOrders();
        setIsDeleteModalOpen(false);
        setIsDeleteConfirmOpen(false);
      } else {
        toast.error('❌ Não foi possível excluir as ordens selecionadas.');
      }
    } catch (err) {
      console.error('Erro ao excluir ordens:', err);
      toast.error('❌ Erro ao excluir as ordens selecionadas.');
    } finally {
      setIsDeletingAllOrders(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Histórico de Ordens de Serviço</h2>
            <p className="text-slate-500">
              {isAdmin ? 'Todas as O.S criadas no sistema' : 'Suas ordens de serviço'}
            </p>
          </div>
          <div className="flex flex-wrap items-stretch gap-2 w-full sm:w-auto">
            {isAdmin && (
              <button
                onClick={openDeleteModal}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
              >
                Excluir O.S
              </button>
            )}
            <button
              onClick={exportToPDF}
              className="bg-slate-700 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-slate-700/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <FileDown size={18} /> Exportar PDF
            </button>
            <button
              onClick={exportToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <Download size={18} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
            <input
              type="text"
              placeholder="Máquina, componente, responsável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
            >
              <option value="all">Todos</option>
              <option value="open">Em Andamento</option>
              <option value="closed">Finalizadas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Manutenção</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'preventiva' | 'corretiva')}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
            >
              <option value="all">Todas</option>
              <option value="corretiva">Corretiva</option>
              <option value="preventiva">Preventiva</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Data inicial</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Data final</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nome do filtro salvo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={savedFilterName}
                onChange={(e) => setSavedFilterName(e.target.value)}
                placeholder="Ex: Finalizadas da semana"
                className="flex-1 p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
              />
              <button
                onClick={saveCurrentFilter}
                className="px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
              >
                <BookmarkPlus size={16} /> Salvar
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filtros salvos</label>
            <select
              defaultValue=""
              onChange={(e) => {
                const found = savedFilters.find((item) => item.id === e.target.value);
                if (found) {
                  applySavedFilter(found);
                }
              }}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
            >
              <option value="">Selecionar...</option>
              {savedFilters.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('closed');
                setFilterType('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Ordens de Serviço</h3>
              <p className="text-slate-500 mb-5">Selecione como deseja excluir e informe motivo + senha de admin.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="border rounded-xl p-3 flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteModeHistory"
                      checked={deleteMode === 'all'}
                      onChange={() => setDeleteMode('all')}
                    />
                    <span className="font-medium text-slate-700">Apagar todas as O.S</span>
                  </label>
                  <label className="border rounded-xl p-3 flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteModeHistory"
                      checked={deleteMode === 'specific'}
                      onChange={() => setDeleteMode('specific')}
                    />
                    <span className="font-medium text-slate-700">Escolher O.S específicas</span>
                  </label>
                </div>

                {deleteMode === 'specific' && (
                  <div className="border border-slate-200 rounded-xl p-3 max-h-52 overflow-y-auto">
                    {filteredOrders.length === 0 ? (
                      <p className="text-sm text-slate-500">Não há O.S para selecionar com os filtros atuais.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredOrders.map(order => (
                          <label key={order.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={(e) => {
                                  setSelectedOrderIds(prev =>
                                    e.target.checked
                                      ? [...prev, order.id]
                                      : prev.filter(id => id !== order.id)
                                  );
                                }}
                              />
                              <span className="text-sm text-slate-700">
                                #{order.id.toString().padStart(4, '0')} - {order.machine_name}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${order.status === 'open' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {order.status === 'open' ? 'Em andamento' : 'Finalizada'}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da exclusão (obrigatório)</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="Ex: Limpeza de base após teste interno..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha do admin</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="Digite a senha do admin"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setIsDeleteConfirmOpen(false);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteContinue}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Continuar
                </button>
              </div>

              {isDeleteConfirmOpen && (
                <div className="mt-5 border border-red-200 bg-red-50 rounded-xl p-4">
                  <p className="text-red-900 font-semibold">Tem certeza que deseja apagar?</p>
                  <p className="text-red-700 text-sm mt-1">
                    {deleteMode === 'all'
                      ? 'Todas as ordens de serviço serão excluídas permanentemente.'
                      : `${selectedOrderIds.length} ordem(ns) selecionada(s) serão excluídas permanentemente.`}
                  </p>
                  <p className="text-red-700 text-sm mt-2">
                    <span className="font-semibold">Motivo:</span> {deleteReason.trim()}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      className="flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 py-2.5 rounded-lg"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleDeleteOrders}
                      disabled={isDeletingAllOrders}
                      className="flex-1 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white py-2.5 rounded-lg"
                    >
                      {isDeletingAllOrders ? 'Apagando...' : 'Sim, apagar agora'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lista de O.S */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhuma ordem encontrada</h3>
            <p className="text-slate-500">Tente ajustar seus filtros de busca.</p>
          </div>
        ) : (
          visibleOrders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                        order.status === 'closed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status === 'closed' ? 'Finalizada' : 'Em Andamento'}
                      </span>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                        order.maintenance_type === 'preventiva'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva'}
                      </span>
                      <span className="text-sm text-slate-400 font-mono">#{order.id.toString().padStart(4, '0')}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{order.machine_name}</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      <span className="font-medium">Responsável:</span> {order.technician_name}
                    </p>
                    <p className="text-slate-600 text-sm">
                      <span className="font-medium">Componente:</span> {order.component}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="text-sm text-slate-500 whitespace-nowrap">
                      <p><span className="font-medium">Operador:</span> {order.operator_name}</p>
                    </div>
                  )}
                </div>

                <p className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg mb-4">{order.description}</p>

                {/* Relatório Final */}
                {order.final_report && (
                  <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-start gap-2 mb-2">
                      <FileText size={16} className="text-emerald-700 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-700 uppercase">Relatório Final</p>
                        <p className="text-sm text-emerald-900 mt-1">{order.final_report}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Datas e Duração */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 text-xs font-medium mb-1">Início</p>
                    <p className="text-slate-800 font-medium">{formatDate(order.start_time)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 text-xs font-medium mb-1">Conclusão</p>
                    <p className="text-slate-800 font-medium">{order.end_time ? formatDate(order.end_time) : '-'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <div>
                      <p className="text-slate-500 text-xs font-medium mb-1">Duração</p>
                      <p className="text-slate-800 font-mono font-bold">{calculateDuration(order.start_time, order.end_time)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 text-xs font-medium mb-1">Status</p>
                    <div className="flex items-center gap-1">
                      {order.status === 'closed' ? (
                        <>
                          <CheckCircle size={16} className="text-emerald-600" />
                          <span className="text-slate-800 font-medium">Fechada</span>
                        </>
                      ) : (
                        <>
                          <Clock size={16} className="text-blue-600" />
                          <span className="text-slate-800 font-medium">Aberta</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {filteredOrders.length > visibleCount && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-5 py-2.5 rounded-lg"
          >
            Carregar mais ({filteredOrders.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {/* Resumo */}
      {filteredOrders.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
            <p className="text-emerald-700 text-sm font-medium mb-1">Total de O.S</p>
            <p className="text-3xl font-bold text-emerald-900">{filteredOrders.length}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <p className="text-blue-700 text-sm font-medium mb-1">Em Andamento</p>
            <p className="text-3xl font-bold text-blue-900">{filteredOrders.filter(o => o.status === 'open').length}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <p className="text-purple-700 text-sm font-medium mb-1">Finalizadas</p>
            <p className="text-3xl font-bold text-purple-900">{filteredOrders.filter(o => o.status === 'closed').length}</p>
          </div>
        </div>
      )}
    </Layout>
  );
}
