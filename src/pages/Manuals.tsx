import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Search, FileText, Upload, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Machine {
  id: number;
  name: string;
  model: string;
  image_url: string | null;
  manual_url: string | null;
  description: string;
  quick_specs: string[]; // array de especificações
}

interface ServiceOrder {
  id: number;
  machine_name: string;
  operator_name: string;
  maintenance_type: 'preventiva' | 'corretiva';
  technician_name: string;
  description: string;
  tools: string[];
  component: string;
  start_time: string;
  end_time: string | null;
  status: 'open' | 'closed';
  final_report?: string;
}

export default function Manuals() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [newMachine, setNewMachine] = useState({
    name: '',
    model: '',
    description: '',
    quickSpecs: [] as string[],
    imageFile: null as File | null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<{category: string, items: string[]}[]>([]);

  // Service Orders state (copied/adapted from ServiceOrders.tsx)
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    machine_id: '',
    maintenance_type: 'corretiva' as 'preventiva' | 'corretiva',
    technician_name: user?.name || '',
    component: '',
    description: '',
    tools: [] as string[],
    toolsInput: ''
  });

  useEffect(() => {
    fetchMachines();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selectedMachine && isChecklistModalOpen) {
      fetch(`/api/checklist-template/${selectedMachine.model}`)
        .then(res => res.json())
        .then(data => setChecklistItems(data.items));
    }
  }, [selectedMachine, isChecklistModalOpen]);

  const fetchMachines = () => {
    fetch('/api/machines')
      .then(res => res.json())
      .then(data => setMachines(data));
  };

  const fetchOrders = () => {
    fetch('/api/service-orders')
      .then(res => res.json())
      .then(data => setOrders(data));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await fetch('/api/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          operator_id: user.id,
          start_time: new Date().toISOString()
        }),
      });

      if (res.ok) {
        fetchOrders();
        setIsModalOpen(false);
        setNewOrder({
          machine_id: '',
          maintenance_type: 'corretiva',
          technician_name: user.name,
          component: '',
          description: '',
          tools: [],
          toolsInput: ''
        });
      }
    } catch (err) {
      console.error(err);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewMachine({ ...newMachine, imageFile: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleQuickSpecsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
    setNewMachine({ ...newMachine, quickSpecs: lines });
  };

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', newMachine.name);
    formData.append('model', newMachine.model);
    formData.append('description', newMachine.description);
    formData.append('quick_specs', JSON.stringify(newMachine.quickSpecs));
    if (newMachine.imageFile) {
      formData.append('image', newMachine.imageFile);
    }

    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        body: formData, // não definir Content-Type, o browser faz automaticamente com boundary
      });

      if (res.ok) {
        fetchMachines();
        setIsMachineModalOpen(false);
        setNewMachine({ name: '', model: '', description: '', quickSpecs: [], imageFile: null });
        setImagePreview(null);
        alert('Equipamento cadastrado com sucesso!');
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao cadastrar equipamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar equipamento.');
    }
  };

  const [finishModalOpen, setFinishModalOpen] = useState(false);
const [finishingOrderId, setFinishingOrderId] = useState<number | null>(null);
const [finalReport, setFinalReport] = useState('');

const handleFinishOrder = async (id: number) => {
  setFinishingOrderId(id);
  setFinishModalOpen(true);
};

const submitFinish = async () => {
  if (!finishingOrderId) return;
  try {
    const res = await fetch(`/api/service-orders/${finishingOrderId}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        end_time: new Date().toISOString(),
        final_report: finalReport
      }),
    });

    if (res.ok) {
      fetchOrders();
      setFinishModalOpen(false);
      setFinalReport('');
      setFinishingOrderId(null);
    }
  } catch (err) {
    console.error(err);
  }
};

const [editReportModalOpen, setEditReportModalOpen] = useState(false);
const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
const [editReport, setEditReport] = useState('');

const openEditReport = (order: ServiceOrder) => {
  setEditingOrder(order);
  setEditReport(order.final_report || '');
  setEditReportModalOpen(true);
};

const submitEditReport = async () => {
  if (!editingOrder) return;
  try {
    const res = await fetch(`/api/service-orders/${editingOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_report: editReport }),
    });

    if (res.ok) {
      fetchOrders();
      setEditReportModalOpen(false);
      setEditingOrder(null);
    }
  } catch (err) {
    console.error(err);
  }
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

// No componente, dentro do map de orders, usar um estado local para forçar atualização
// Mas como queremos atualizar todas simultaneamente, podemos usar um timer global

const [timer, setTimer] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setTimer(t => t + 1); // força re-render a cada segundo
  }, 1000);
  return () => clearInterval(interval);
}, []);


  const handleDeleteMachine = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este equipamento? Todos os dados associados serão perdidos.')) return;
    try {
      const res = await fetch(`/api/machines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMachines();
        setSelectedMachine(null);
        alert('Equipamento excluído com sucesso!');
      } else {
        alert('Erro ao excluir equipamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir equipamento.');
    }
  };

  const handleSaveChecklist = async () => {
    if (!selectedMachine) return;
    try {
      const res = await fetch('/api/checklist-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_model: selectedMachine.model,
          items: checklistItems
        }),
      });
      if (res.ok) {
        setIsChecklistModalOpen(false);
        alert('Checklist atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar checklist.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar checklist.');
    }
  };

  const handleUploadManual = async (e: React.ChangeEvent<HTMLInputElement>, machineId: number) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('manual', file);

    setIsUploading(true);
    try {
      const res = await fetch(`/api/machines/${machineId}/manual`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchMachines();
        const { manual_url } = await res.json();
        if (selectedMachine && selectedMachine.id === machineId) {
          setSelectedMachine({ ...selectedMachine, manual_url });
        }
        alert('Manual enviado com sucesso!');
      } else {
        alert('Erro ao enviar manual.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar manual.');
    } finally {
      setIsUploading(false);
    }
  };

  const filteredMachines = machines.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manuais Técnicos</h2>
          <p className="text-slate-500">Biblioteca de equipamentos e instruções</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar equipamento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
            />
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setIsMachineModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <Upload size={20} /> Novo Equipamento
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMachines.map((machine) => (
          <motion.div
            key={machine.id}
            layoutId={`card-${machine.id}`}
            onClick={() => setSelectedMachine(machine)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-slate-100"
          >
            <div className="aspect-video bg-slate-100 relative overflow-hidden">
              <img 
                src={machine.image_url || 'https://picsum.photos/400/300'} 
                alt={machine.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <span className="text-white font-medium text-sm">Ver detalhes</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 truncate">{machine.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{machine.model}</p>
              
              <div className="flex items-center gap-2 text-xs font-medium">
                {machine.manual_url ? (
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                    <FileText size={12} /> Manual Disponível
                  </span>
                ) : (
                  <span className="text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                    Sem manual
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal de criação de equipamento */}
      <AnimatePresence>
        {isMachineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Novo Equipamento</h3>
              <form onSubmit={handleCreateMachine} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={newMachine.name}
                    onChange={e => setNewMachine({ ...newMachine, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    required
                    value={newMachine.model}
                    onChange={e => setNewMachine({ ...newMachine, model: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto do Equipamento</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                  <textarea
                    value={newMachine.description}
                    onChange={e => setNewMachine({ ...newMachine, description: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Especificações Rápidas (uma por linha)</label>
                  <textarea
                    value={newMachine.quickSpecs.join('\n')}
                    onChange={handleQuickSpecsChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-200 outline-none"
                    rows={4}
                    placeholder="Ex: Motor Diesel&#10;Hidráulica de Alta Pressão&#10;Cabine Climatizada"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMachineModalOpen(false);
                      setNewMachine({ name: '', model: '', description: '', quickSpecs: [], imageFile: null });
                      setImagePreview(null);
                    }}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        
        <form onSubmit={handleCreateOrder} className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">Equipamento</label>
    <select
      required
      value={newOrder.machine_id}
      onChange={(e) => setNewOrder({ ...newOrder, machine_id: e.target.value })}
      className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
    >
      <option value="">Selecione...</option>
      {machines.map(m => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
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
        <p className="text-slate-500 mb-4">Descreva o que foi realizado, problemas adicionais, etc.</p>
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
            onClick={submitFinish}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-colors"
          >
            Finalizar
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

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
        <textarea
          value={editReport}
          onChange={(e) => setEditReport(e.target.value)}
          className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
          rows={5}
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setEditReportModalOpen(false)}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submitEditReport}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-colors"
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>

      {/* Modal de edição de checklist */}
      <AnimatePresence>
        {isChecklistModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-6">Editar Checklist: {selectedMachine?.model}</h3>
              
              <div className="space-y-6">
                {checklistItems.map((cat, catIndex) => (
                  <div key={catIndex} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="text"
                        value={cat.category}
                        onChange={e => {
                          const newItems = [...checklistItems];
                          newItems[catIndex].category = e.target.value;
                          setChecklistItems(newItems);
                        }}
                        className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                      />
                      <button
                        onClick={() => {
                          const newItems = checklistItems.filter((_, i) => i !== catIndex);
                          setChecklistItems(newItems);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remover Categoria
                      </button>
                    </div>
                    <div className="space-y-2 pl-4">
                      {cat.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={e => {
                              const newItems = [...checklistItems];
                              newItems[catIndex].items[itemIndex] = e.target.value;
                              setChecklistItems(newItems);
                            }}
                            className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                          />
                          <button
                            onClick={() => {
                              const newItems = [...checklistItems];
                              newItems[catIndex].items = newItems[catIndex].items.filter((_, i) => i !== itemIndex);
                              setChecklistItems(newItems);
                            }}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newItems = [...checklistItems];
                          newItems[catIndex].items.push("Novo Item");
                          setChecklistItems(newItems);
                        }}
                        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-2"
                      >
                        + Adicionar Item
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setChecklistItems([...checklistItems, { category: "Nova Categoria", items: [] }])}
                  className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors font-medium"
                >
                  + Adicionar Categoria
                </button>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={() => setIsChecklistModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChecklist}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
                >
                  Salvar Checklist
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de detalhes do equipamento */}
      <AnimatePresence>
        {selectedMachine && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedMachine(null)}>
            <motion.div 
              layoutId={`card-${selectedMachine.id}`}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative h-64 bg-slate-100">
                <img 
                  src={selectedMachine.image_url || 'https://picsum.photos/400/300'} 
                  alt={selectedMachine.name}
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setSelectedMachine(null)}
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedMachine.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="bg-slate-100 px-3 py-1 rounded-full">{selectedMachine.model}</span>
                      <span>Atualizado em: {new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => handleDeleteMachine(selectedMachine.id)}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Excluir Equipamento"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                <div className="prose prose-slate max-w-none mb-8">
                  <h4 className="text-lg font-semibold text-slate-800 mb-2">Descrição do Equipamento</h4>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedMachine.description}
                  </p>
                  
                  <h4 className="text-lg font-semibold text-slate-800 mt-6 mb-2">Especificações Rápidas</h4>
                  <ul className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    {selectedMachine.quick_specs && selectedMachine.quick_specs.length > 0 ? (
                      selectedMachine.quick_specs.map((spec, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> {spec}
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-400">Nenhuma especificação cadastrada.</li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {selectedMachine.manual_url ? (
                      <a 
                        href={selectedMachine.manual_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                      >
                        <FileText size={20} />
                        Ler Manual
                      </a>
                    ) : (
                      <button disabled className="flex-1 bg-slate-100 text-slate-400 font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                        <FileText size={20} />
                        Manual Indisponível
                      </button>
                    )}

                    {user?.role === 'admin' && (
                      <label className={`flex-1 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-600 font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${isUploading ? 'opacity-50' : ''}`}>
                        <Upload size={20} />
                        {isUploading ? 'Enviando...' : 'Upload Novo Manual'}
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={(e) => handleUploadManual(e, selectedMachine.id)}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                  
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => setIsChecklistModalOpen(true)}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileText size={20} /> Editar Template de Checklist
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}