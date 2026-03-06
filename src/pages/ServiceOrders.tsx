import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, CheckCircle, AlertTriangle, Play, Square, X, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getServiceOrders, 
  getMachines, 
  getPartsTools, 
  createServiceOrder, 
  updateServiceOrder, 
  closeServiceOrder,
  createPartTool,
  deletePartTool
} from '../lib/supabaseApi';

interface PartTool {
  id: number;
  name: string;
  description: string;
  category: 'part' | 'tool';
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

interface Machine {
  id: number;
  name: string;
}

export default function ServiceOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timer, setTimer] = useState(0);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishingOrderId, setFinishingOrderId] = useState<number | null>(null);
  const [finalReport, setFinalReport] = useState('');
  const [partsTools, setPartsTools] = useState<PartTool[]>([]);
  const [isPartsToolsModalOpen, setIsPartsToolsModalOpen] = useState(false);
  const [newPartTool, setNewPartTool] = useState({ name: '', description: '', category: 'tool' as 'tool' | 'part' });
  const [editReportModalOpen, setEditReportModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [editReport, setEditReport] = useState('');
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editToolsInput, setEditToolsInput] = useState('');
  const [editComponent, setEditComponent] = useState('');
  const [newOrder, setNewOrder] = useState({
  machine_id: '',
  maintenance_type: 'corretiva' as 'preventiva' | 'corretiva',
  technician_name: '',
  component: '',
  description: '',
  used_parts_tools: [] as number[],
  tools: [] as string[],
  toolsInput: ''
});
  useEffect(() => {
    fetchOrders();
    fetchMachines();
    fetchPartsTools();
  }, []);

  const fetchMachines = async () => {
    try {
      const data = await getMachines();
      setMachines(data);
    } catch (err) {
      console.error('Erro ao buscar máquinas:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await getServiceOrders();
      setOrders(data);
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    }
  };

  const fetchPartsTools = async () => {
    try {
      const data = await getPartsTools();
      setPartsTools(data);
    } catch (err) {
      console.error('Erro ao buscar peças/ferramentas:', err);
    }
  };


  const handleCreatePartTool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createPartTool(newPartTool);
      if (result) {
        await fetchPartsTools();
        setNewPartTool({ name: '', description: '', category: 'tool' });
        alert('✅ Item cadastrado!');
      } else {
        alert('❌ Erro ao cadastrar.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Erro ao cadastrar.');
    }
  };

  const handleDeletePartTool = async (id: number) => {
    if (!confirm('Remover este item?')) return;
    try {
      const result = await deletePartTool(id);
      if (result) {
        await fetchPartsTools();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validações de campos obrigatórios
    const camposObrigatorios = [
      { campo: 'machine_id', label: 'Máquina' },
      { campo: 'technician_name', label: 'Responsável' },
      { campo: 'component', label: 'Componente com Falha' },
      { campo: 'description', label: 'Descrição do Problema' }
    ];

    const campoFaltante = camposObrigatorios.find(c => !newOrder[c.campo as keyof typeof newOrder]);
    
    if (campoFaltante) {
      alert(`⚠️ Campo obrigatório não preenchido:\n\n"${campoFaltante.label}"\n\nPor favor, preencha todos os campos obrigatórios.`);
      return;
    }

    try {
      // Encontrar máquina e operador
      const machine = machines.find(m => m.id == newOrder.machine_id);
      
      const result = await createServiceOrder({
        ...newOrder,
        machine_id: parseInt(newOrder.machine_id),
        machine_name: machine?.name || `Máquina ${newOrder.machine_id}`,
        operator_id: user.id,
        operator_name: user.name,
        start_time: new Date().toISOString(),
        status: 'open',
        used_parts_tools: newOrder.used_parts_tools,
        tools: newOrder.tools
      });

      if (result) {
        alert('✅ Ordem de serviço criada com sucesso!');
        await fetchOrders();
        setIsModalOpen(false);
        setNewOrder({
          machine_id: '',
          maintenance_type: 'corretiva',
          technician_name: '',
          component: '',
          description: '',
          used_parts_tools: [],
          tools: [],
          toolsInput: ''
        });
      } else {
        alert('❌ Erro ao criar ordem de serviço.');
      }
    } catch (err) {
      console.error('Erro ao criar ordem:', err);
      alert('❌ Erro ao criar ordem de serviço.');
    }
  };

  const handleFinishOrder = async (id: number) => {
    if (!confirm('Deseja realmente finalizar esta ordem de serviço?')) return;

    try {
      const success = await closeServiceOrder(id, new Date().toISOString());
      if (success) {
        await fetchOrders();
        alert('✅ Ordem de serviço finalizada com sucesso!');
      } else {
        alert('❌ Erro ao finalizar ordem de serviço.');
      }
    } catch (err) {
      console.error('Erro ao finalizar ordem:', err);
      alert('❌ Erro ao finalizar ordem de serviço.');
    }
  };

  const addTool = () => {
    if (newOrder.toolsInput.trim()) {
      setNewOrder({
        ...newOrder,
        tools: [...newOrder.tools, newOrder.toolsInput.trim()],
        toolsInput: ''
      });
    }
  };

  const removeTool = (index: number) => {
    setNewOrder({
      ...newOrder,
      tools: newOrder.tools.filter((_, i) => i !== index)
    });
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

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manutenção Corretiva</h2>
          <p className="text-slate-500">Gerenciamento de ordens de serviço</p>
        </div>
        <div className="flex items-center gap-3">
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsPartsToolsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all"
            >
              <Package size={20} /> Cadastrar Peça/Ferramenta
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
          >
            <Plus size={20} /> Nova O.S.
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${order.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                  {order.status === 'open' ? 'Em Andamento' : 'Finalizada'}
                </span>
                <span className="text-sm text-slate-400 font-mono">#{order.id.toString().padStart(4, '0')}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{order.machine_name}</h3>
              <p className="text-slate-600 mt-1"><span className="font-medium">Componente:</span> {order.component}</p>
              <p className="text-slate-500 text-sm mt-2 bg-slate-50 p-2 rounded-lg">{order.description}</p>
              {order.used_parts_tools && order.used_parts_tools.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">Itens utilizados:</p>
                  <div className="flex flex-wrap gap-2">
                    {order.used_parts_tools.map(id => {
                      const item = partsTools.find(pt => pt.id === id);
                      return item ? (
                        <span key={id} className={`text-xs px-2 py-1 rounded-full ${item.category === 'tool' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {item.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-4 min-w-[200px]">
              <div className="text-right">
                <div className="flex items-center gap-2 text-slate-500 text-sm justify-end">
                  <Clock size={16} />
                  Duração
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800">
                  {calculateDuration(order.start_time, order.end_time)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {order.status === 'open' ? (
                  <button
                    onClick={() => {
                      setFinishingOrderId(order.id);
                      setFinalReport('');
                      setFinishModalOpen(true);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Square size={16} fill="currentColor" /> Finalizar
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingOrder(order);
                        setEditReport(order.final_report || '');
                        setEditTools(order.tools || []);
                        setEditComponent(order.component || '');
                        setEditReportModalOpen(true);
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Editar Relatório
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {orders.length === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-slate-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Nenhuma ordem de serviço</h3>
            <p className="text-slate-500">Clique em "Nova O.S." para começar.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Abrir Ordem de Serviço</h3>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Máquina *</label>
                  <select
                    required
                    value={newOrder.machine_id}
                    onChange={(e) => setNewOrder({ ...newOrder, machine_id: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
                  >
                    <option value="">Selecione uma máquina</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>{machine.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Peças/Ferramentas Utilizadas</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                    {partsTools.map(item => (
                      <label key={item.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg">
                        <input
                          type="checkbox"
                          value={item.id}
                          checked={newOrder.used_parts_tools.includes(item.id)}
                          onChange={(e) => {
                            const id = item.id;
                            setNewOrder(prev => ({
                              ...prev,
                              used_parts_tools: e.target.checked
                                ? [...prev.used_parts_tools, id]
                                : prev.used_parts_tools.filter(i => i !== id)
                            }));
                          }}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-slate-700">{item.name}</span>
                          {item.description && <span className="text-xs text-slate-500 ml-2">({item.description})</span>}
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${item.category === 'tool' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {item.category === 'tool' ? 'Ferramenta' : 'Peça'}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Manutenção</label>
                  <select
                    value={newOrder.maintenance_type}
                    onChange={(e) => setNewOrder({ ...newOrder, maintenance_type: e.target.value as 'preventiva' | 'corretiva' })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
                  >
                    <option value="corretiva">Corretiva</option>
                    <option value="preventiva">Preventiva</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                  <input
                    type="text"
                    required
                    value={newOrder.technician_name}
                    onChange={(e) => setNewOrder({ ...newOrder, technician_name: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Componente com Falha</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Motor, Mangueira, Pneu..."
                    value={newOrder.component}
                    onChange={(e) => setNewOrder({ ...newOrder, component: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
                  <textarea
                    required
                    placeholder="Descreva o problema detalhadamente..."
                    value={newOrder.description}
                    onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ferramentas Utilizadas</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOrder.toolsInput}
                      onChange={(e) => setNewOrder({ ...newOrder, toolsInput: e.target.value })}
                      className="flex-1 p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                      placeholder="Ex: Chave de fenda"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                    />
                    <button
                      type="button"
                      onClick={addTool}
                      className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-4 rounded-lg"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newOrder.tools.map((tool, index) => (
                      <span key={index} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        {tool}
                        <button type="button" onClick={() => removeTool(index)} className="text-slate-500 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={18} /> Iniciar Trabalho
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Parts/Tools management modal */}
      <AnimatePresence>
        {isPartsToolsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Cadastrar Peça / Ferramenta</h3>

              <form onSubmit={handleCreatePartTool} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={newPartTool.name}
                    onChange={e => setNewPartTool({ ...newPartTool, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label>
                  <input
                    type="text"
                    value={newPartTool.description}
                    onChange={e => setNewPartTool({ ...newPartTool, description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select
                    value={newPartTool.category}
                    onChange={e => setNewPartTool({ ...newPartTool, category: e.target.value as 'tool' | 'part' })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-200 outline-none bg-white"
                  >
                    <option value="tool">Ferramenta</option>
                    <option value="part">Peça</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-xl transition-colors"
                >
                  Salvar Item
                </button>
              </form>

              <h4 className="font-bold text-slate-800 mb-3">Itens Cadastrados</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {partsTools.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium text-slate-800">{item.name}</span>
                      {item.description && <span className="text-xs text-slate-500 ml-2">({item.description})</span>}
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${item.category === 'tool' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {item.category === 'tool' ? 'Ferramenta' : 'Peça'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeletePartTool(item.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Remover"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setIsPartsToolsModalOpen(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Finish modal */}
      <AnimatePresence>
        {finishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Finalizar Ordem de Serviço</h3>
              <p className="text-slate-500 mb-4">Descreva o que foi realizado (opcional).</p>
              <textarea
                value={finalReport}
                onChange={(e) => setFinalReport(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                rows={5}
                placeholder="Ex: Substituído motor, realizado teste, tudo ok..."
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setFinishModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!finishingOrderId) return;
                    try {
                      const result = await closeServiceOrder(
                        finishingOrderId,
                        new Date().toISOString(),
                        finalReport || undefined
                      );
                      if (result) {
                        alert('✅ Ordem de serviço finalizada com sucesso!');
                        await fetchOrders();
                        setFinishModalOpen(false);
                        setFinalReport('');
                        setFinishingOrderId(null);
                      } else {
                        alert('❌ Erro ao finalizar ordem de serviço.');
                      }
                    } catch (err) {
                      console.error(err);
                      alert('❌ Erro ao finalizar ordem de serviço.');
                    }
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit report modal */}
      <AnimatePresence>
        {editReportModalOpen && editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Editar Relatório Final</h3>
              <p className="text-slate-500 mb-4">Atualize as informações da OS #{editingOrder.id.toString().padStart(4, '0')}</p>
              <label className="block text-sm font-medium text-slate-700 mb-1">Componente *</label>
              <input
                type="text"
                required
                value={editComponent}
                onChange={(e) => setEditComponent(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 mb-3"
              />
              <label className="block text-sm font-medium text-slate-700 mb-1">Ferramentas Utilizadas</label>
              <div className="flex gap-2 mb-3">
                <input value={editToolsInput} onChange={e => setEditToolsInput(e.target.value)} className="flex-1 p-3 rounded-lg border border-slate-200" placeholder="Adicionar ferramenta" onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), setEditTools(prev => [...prev, editToolsInput.trim()]), setEditToolsInput(''))} />
                <button type="button" onClick={() => { if (editToolsInput.trim()) { setEditTools(prev => [...prev, editToolsInput.trim()]); setEditToolsInput(''); } }} className="px-4 py-2 bg-slate-100 rounded-lg">Adicionar</button>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {editTools.map((t, i) => (
                  <span key={i} className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                    {t}
                    <button onClick={() => setEditTools(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-500">x</button>
                  </span>
                ))}
              </div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relatório Final (opcional)</label>
              <textarea value={editReport} onChange={e => setEditReport(e.target.value)} rows={5} className="w-full p-3 rounded-lg border border-slate-200 mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setEditReportModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-lg">Cancelar</button>
                <button onClick={async () => {
                  if (!editingOrder) return;
                  
                  // Validar campo obrigatório
                  if (!editComponent.trim()) {
                    alert('⚠️ Campo obrigatório não preenchido:\n\n"Componente"\n\nPor favor, preencha todos os campos obrigatórios.');
                    return;
                  }
                  
                  try {
                    const result = await updateServiceOrder(editingOrder.id, {
                      final_report: editReport,
                      tools: editTools,
                      component: editComponent
                    });
                    
                    if (result) {
                      alert('✅ Relatório atualizado com sucesso!');
                      await fetchOrders();
                      setEditReportModalOpen(false);
                      setEditingOrder(null);
                    } else {
                      alert('❌ Erro ao atualizar relatório.');
                    }
                  } catch (err) { 
                    console.error(err);
                    alert('❌ Erro ao atualizar relatório.');
                  }
                }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
