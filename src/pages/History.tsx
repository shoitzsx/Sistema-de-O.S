import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, CheckCircle, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';
import {
  getServiceOrders,
  deleteServiceOrdersByScope,
  deleteServiceOrdersByIds,
  verifyUserCredentials,
} from '../lib/supabaseApi';

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
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('closed');
  const [filterType, setFilterType] = useState<'all' | 'preventiva' | 'corretiva'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeletingAllOrders, setIsDeletingAllOrders] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'specific'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, filterStatus, filterType, searchTerm, user]);

  const fetchOrders = async () => {
    try {
      const data = await getServiceOrders();
      setOrders(data);
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    }
  };

  const filterOrders = () => {
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

    // Ordenar por data mais recente primeiro
    filtered.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    setFilteredOrders(filtered);
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

  const exportToCSV = () => {
    const headers = ['ID', 'Máquina', 'Operador', 'Responsável', 'Tipo', 'Componente', 'Início', 'Fim', 'Duração', 'Status', 'Relatório'];
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map(order => [
        `#${order.id.toString().padStart(4, '0')}`,
        order.machine_name,
        order.operator_name,
        order.technician_name,
        order.maintenance_type === 'preventiva' ? 'Preventiva' : 'Corretiva',
        order.component,
        formatDate(order.start_time),
        order.end_time ? formatDate(order.end_time) : '-',
        calculateDuration(order.start_time, order.end_time),
        order.status === 'closed' ? 'Finalizada' : 'Em Andamento',
        order.final_report ? `"${order.final_report.replace(/"/g, '""')}"` : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-os-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Histórico de Ordens de Serviço</h2>
            <p className="text-slate-500">
              {isAdmin ? 'Todas as O.S criadas no sistema' : 'Suas ordens de serviço'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={openDeleteModal}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-2 transition-all"
              >
                Excluir O.S
              </button>
            )}
            <button
              onClick={exportToCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
            >
              <Download size={18} /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('closed');
                setFilterType('all');
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6"
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

              <div className="flex gap-3 mt-6">
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
                  <div className="flex gap-2 mt-4">
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
          filteredOrders.map((order) => (
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
