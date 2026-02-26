import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, MinusCircle, ChevronRight, Save, Calendar, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

interface ChecklistItem {
  status: 'ok' | 'nok' | 'na' | null;
  observation: string;
}

interface ChecklistData {
  [key: string]: ChecklistItem;
}

interface Machine {
  id: number;
  name: string;
  model: string;
}

interface TemplateCategory {
  category: string;
  items: string[];
}

export default function Checklist() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [template, setTemplate] = useState<TemplateCategory[]>([]);
  const [checklistData, setChecklistData] = useState<ChecklistData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [templateItems, setTemplateItems] = useState<TemplateCategory[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/machines')
      .then(res => res.json())
      .then(data => {
        setMachines(data);
        // Extract unique models
        const models = Array.from(new Set(data.map((m: Machine) => m.model))) as string[];
        setAvailableModels(models);
      });
  }, []);

  useEffect(() => {
    if (editingModel) {
      fetch(`/api/checklist-template/${editingModel}`)
        .then(res => res.json())
        .then(data => setTemplateItems(data.items || []));
    }
  }, [editingModel]);

  const handleSaveTemplate = async () => {
    if (!editingModel) return;
    try {
      const res = await fetch('/api/checklist-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_model: editingModel,
          items: templateItems
        }),
      });
      if (res.ok) {
        setIsTemplateModalOpen(false);
        setEditingModel(null);
        alert('Template salvo com sucesso!');
      } else {
        alert('Erro ao salvar template.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar template.');
    }
  };

  const handleStatusChange = (item: string, status: 'ok' | 'nok' | 'na') => {
    setChecklistData(prev => ({
      ...prev,
      [item]: { ...prev[item], status }
    }));
  };

  const handleObservationChange = (item: string, observation: string) => {
    setChecklistData(prev => ({
      ...prev,
      [item]: { ...prev[item], observation }
    }));
  };

  const handleSubmit = async () => {
    if (!selectedMachine || !user) return;

    // Validate NOK items have observations
    const nokItemsWithoutObs = Object.entries(checklistData).filter(
      ([_, val]: [string, ChecklistItem]) => val.status === 'nok' && !val.observation.trim()
    );

    if (nokItemsWithoutObs.length > 0) {
      alert('Por favor, adicione uma observação para todos os itens marcados como NOK.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: selectedMachine.id,
          operator_id: user.id,
          date: new Date().toISOString(),
          data: checklistData,
          status: 'completed'
        }),
      });

      if (res.ok) {
        alert('Checklist salvo com sucesso!');
        setSelectedMachine(null);
        setChecklistData({});
      } else {
        alert('Erro ao salvar checklist.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar checklist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateProgress = () => {
    const total = Object.keys(checklistData).length;
    if (total === 0) return 0;
    const answered = Object.values(checklistData).filter((i: ChecklistItem) => i.status !== null).length;
    return Math.round((answered / total) * 100);
  };

  // ... (existing handlers)

  if (!selectedMachine) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Checklist Mensal</h2>
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
              >
                <Save size={20} /> Gerenciar Templates
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map(machine => (
              <button
                key={machine.id}
                onClick={() => setSelectedMachine(machine)}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all text-left group"
              >
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">{machine.name}</h3>
                <p className="text-slate-500 text-sm mt-1">{machine.model}</p>
                <div className="mt-4 flex items-center text-emerald-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Iniciar Inspeção <ChevronRight size={16} className="ml-1" />
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {isTemplateModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
                >
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Gerenciar Templates de Checklist</h3>
                  
                  {!editingModel ? (
                    <div className="space-y-4">
                      <p className="text-slate-500 mb-4">Selecione um modelo de equipamento para editar seu checklist:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {availableModels.map(model => (
                          <button
                            key={model}
                            onClick={() => setEditingModel(model)}
                            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all"
                          >
                            <span className="font-bold text-slate-800">{model}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <button
                          onClick={() => setIsTemplateModalOpen(false)}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <h4 className="font-bold text-slate-800">Editando: {editingModel}</h4>
                        <button 
                          onClick={() => setEditingModel(null)}
                          className="text-sm text-slate-500 hover:text-slate-800"
                        >
                          Voltar
                        </button>
                      </div>

                      {templateItems.map((cat, catIndex) => (
                        <div key={catIndex} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center mb-3">
                            <input
                              type="text"
                              value={cat.category}
                              onChange={e => {
                                const newItems = [...templateItems];
                                newItems[catIndex].category = e.target.value;
                                setTemplateItems(newItems);
                              }}
                              className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none"
                            />
                            <button
                              onClick={() => {
                                const newItems = templateItems.filter((_, i) => i !== catIndex);
                                setTemplateItems(newItems);
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remover
                            </button>
                          </div>
                          <div className="space-y-2 pl-4">
                            {cat.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={item}
                                  onChange={e => {
                                    const newItems = [...templateItems];
                                    newItems[catIndex].items[itemIndex] = e.target.value;
                                    setTemplateItems(newItems);
                                  }}
                                  className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                />
                                <button
                                  onClick={() => {
                                    const newItems = [...templateItems];
                                    newItems[catIndex].items = newItems[catIndex].items.filter((_, i) => i !== itemIndex);
                                    setTemplateItems(newItems);
                                  }}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <XCircle size={16} />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newItems = [...templateItems];
                                newItems[catIndex].items.push("Novo Item");
                                setTemplateItems(newItems);
                              }}
                              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-2"
                            >
                              + Adicionar Item
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => setTemplateItems([...templateItems, { category: "Nova Categoria", items: [] }])}
                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-colors font-medium"
                      >
                        + Adicionar Categoria
                      </button>

                      <div className="flex gap-3 mt-6 pt-6 border-t border-slate-100">
                        <button
                          onClick={() => setEditingModel(null)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveTemplate}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl shadow-lg shadow-emerald-600/20 transition-colors"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    );
  }

  const progress = calculateProgress();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-24">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 sticky top-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button 
                onClick={() => setSelectedMachine(null)}
                className="text-sm text-slate-500 hover:text-slate-800 mb-1 block"
              >
                &larr; Trocar Equipamento
              </button>
              <h2 className="text-xl font-bold text-slate-900">{selectedMachine.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-500">Progresso</div>
              <div className="text-2xl font-bold text-emerald-600">{progress}%</div>
            </div>
          </div>
          
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-4">
          {template.map((category, catIndex) => (
            <div key={catIndex} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <button 
                onClick={() => setOpenCategory(openCategory === category.category ? null : category.category)}
                className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 text-lg">{category.category}</span>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">
                    {category.items.length} itens
                  </span>
                </div>
                {openCategory === category.category ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
              </button>
              
              <AnimatePresence>
                {openCategory === category.category && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                      {category.items.map((item, itemIndex) => {
                        const current = checklistData[item] || { status: null, observation: '' };
                        return (
                          <div key={itemIndex} className="p-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                              <span className="font-medium text-slate-700 text-base">{item}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStatusChange(item, 'ok')}
                                  className={clsx(
                                    "flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                    current.status === 'ok' 
                                      ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105" 
                                      : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
                                  )}
                                >
                                  <CheckCircle size={18} /> OK
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item, 'nok')}
                                  className={clsx(
                                    "flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                    current.status === 'nok' 
                                      ? "bg-red-500 border-red-600 text-white shadow-md shadow-red-500/20 scale-105" 
                                      : "bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                                  )}
                                >
                                  <XCircle size={18} /> NOK
                                </button>
                                <button
                                  onClick={() => handleStatusChange(item, 'na')}
                                  className={clsx(
                                    "flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                    current.status === 'na' 
                                      ? "bg-slate-500 border-slate-600 text-white shadow-md shadow-slate-500/20 scale-105" 
                                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                                  )}
                                >
                                  <MinusCircle size={18} /> N/A
                                </button>
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {(current.status === 'nok' || current.observation) && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                >
                                  <div className="relative mt-2">
                                    <AlertCircle className="absolute left-3 top-3 text-amber-500" size={18} />
                                    <textarea
                                      placeholder="Descreva o problema (obrigatório para NOK)..."
                                      value={current.observation}
                                      onChange={(e) => handleObservationChange(item, e.target.value)}
                                      className="w-full pl-10 p-3 rounded-lg border border-amber-200 bg-amber-50 text-slate-700 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none resize-none"
                                      rows={2}
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="text-sm text-slate-500 hidden sm:block">
              {Object.values(checklistData).filter((i: ChecklistItem) => i.status === null).length} itens restantes
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : (
                <>
                  <Save size={20} /> Finalizar Inspeção
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
