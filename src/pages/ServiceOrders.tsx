import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, CheckCircle, AlertTriangle, Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ServiceOrder {
  id: number;
  machine_name: string;
  operator_name: string;
  description: string;
  component: string;
  start_time: string;
  end_time: string | null;
  status: 'open' | 'closed';
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
  const [newOrder, setNewOrder] = useState({
    machine_id: '',
    component: '',
    description: ''
  });

  useEffect(() => {
    fetchOrders();
    fetch('/api/machines')
      .then(res => res.json())
      .then(data => setMachines(data));
  }, []);

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
        setNewOrder({ machine_id: '', component: '', description: '' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishOrder = async (id: number) => {
    if (!confirm('Deseja realmente finalizar esta ordem de serviço?')) return;

    try {
      const res = await fetch(`/api/service-orders/${id}/close`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          end_time: new Date().toISOString()
        }),
      });

      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const diff = endTime - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manutenção Corretiva</h2>
          <p className="text-slate-500">Gerenciamento de ordens de serviço</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
        >
          <Plus size={20} /> Nova O.S.
        </button>
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

              {order.status === 'open' && (
                <button
                  onClick={() => handleFinishOrder(order.id)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Square size={16} fill="currentColor" /> Finalizar
                </button>
              )}
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
    </Layout>
  );
}
