import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, MinusCircle, ChevronRight, Save, Calendar, ChevronDown, ChevronUp, AlertCircle, Plus, Trash2, Settings } from 'lucide-react';
import clsx from 'clsx';
import { getMachines, getChecklistTemplateByModel, createChecklist } from '../lib/supabaseApi';
import { supabase } from '../lib/supabase';

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

export default function Checklist() {
  const { user } = useAuth();
  const isAdmin = String(user?.role || '').trim().toLowerCase() === 'admin';

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
  const [isNewModelMode, setIsNewModelMode] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemByCategory, setNewItemByCategory] = useState<Record<number, string>>({});
  const [nokItemsToConfirm, setNokItemsToConfirm] = useState<string[]>([]);
  const [showNokConfirmDialog, setShowNokConfirmDialog] = useState(false);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const data = await getMachines();
      setMachines(data);
      const models = Array.from(new Set(data.map((m: Machine) => m.model))) as string[];
      setAvailableModels(models);
    } catch (err) {
      console.error('Erro ao carregar máquinas:', err);
      toast.error('Erro ao carregar máquinas');
    }
  };

  useEffect(() => {
    if (editingModel) {
      loadTemplate(editingModel);
    }
  }, [editingModel]);

  useEffect(() => {
    if (selectedMachine) {
      loadTemplate(selectedMachine.model);
    } else {
      setTemplate([]);
    }
  }, [selectedMachine]);

  const loadTemplate = async (model: string) => {
    try {
      const templateData = await getChecklistTemplateByModel(model);
      if (templateData) {
        const items = templateData.items || [];
        if (editingModel) {
          setTemplateItems(items);
        } else {
          setTemplate(items);
          setChecklistData({});
          setOpenCategory(null);
        }
      } else if (!editingModel) {
        setTemplate([]);
        setChecklistData({});
        setOpenCategory(null);
      } else if (editingModel) {
        setTemplateItems([]);
      }
    } catch (err) {
      console.error('Erro ao carregar template:', err);
    }
  };

  const openTemplateModal = () => {
    setIsTemplateModalOpen(true);
    setIsNewModelMode(false);
    setNewModelName('');
    setNewCategoryName('');
    setNewItemByCategory({});
    const defaultModel = selectedMachine?.model || availableModels[0] || null;
    setEditingModel(defaultModel);
    setTemplateItems([]);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingModel(null);
    setTemplateItems([]);
    setNewCategoryName('');
    setNewItemByCategory({});
    setIsNewModelMode(false);
    setNewModelName('');
  };

  const addCategory = () => {
    const category = newCategoryName.trim();
    if (!category) return;
    setTemplateItems(prev => [...prev, { category, items: [] }]);
    setNewCategoryName('');
  };

  const removeCategory = (categoryIndex: number) => {
    setTemplateItems(prev => prev.filter((_, idx) => idx !== categoryIndex));
  };

  const addItemToCategory = (categoryIndex: number) => {
    const text = (newItemByCategory[categoryIndex] || '').trim();
    if (!text) return;

    setTemplateItems(prev =>
      prev.map((cat, idx) =>
        idx === categoryIndex ? { ...cat, items: [...cat.items, text] } : cat
      )
    );

    setNewItemByCategory(prev => ({ ...prev, [categoryIndex]: '' }));
  };

  const removeItemFromCategory = (categoryIndex: number, itemIndex: number) => {
    setTemplateItems(prev =>
      prev.map((cat, idx) =>
        idx === categoryIndex
          ? { ...cat, items: cat.items.filter((_, i) => i !== itemIndex) }
          : cat
      )
    );
  };

  const handleSaveTemplate = async () => {
    const modelToSave = isNewModelMode ? newModelName.trim() : (editingModel || '').trim();

    if (!modelToSave) {
      toast.error('Informe o modelo da máquina para salvar o template.');
      return;
    }

    if (!templateItems.length) {
      toast.error('Adicione pelo menos uma categoria ao template.');
      return;
    }

    const normalizedTemplate = templateItems
      .map(cat => ({
        category: cat.category.trim(),
        items: cat.items.map(item => item.trim()).filter(Boolean)
      }))
      .filter(cat => cat.category && cat.items.length > 0);

    if (!normalizedTemplate.length) {
      toast.error('Cada categoria deve ter ao menos um item válido.');
      return;
    }

    try {
      const { error } = await supabase
        .from('checklist_templates')
        .upsert({ machine_model: modelToSave, items: JSON.stringify(normalizedTemplate) }, { onConflict: 'machine_model' });

      if (error) throw error;

      toast.success('Template de inspeção salvo com sucesso!');

      if (!availableModels.includes(modelToSave)) {
        setAvailableModels(prev => [...prev, modelToSave]);
      }

      if (selectedMachine?.model === modelToSave) {
        setTemplate(normalizedTemplate);
        setChecklistData({});
        setOpenCategory(null);
      }

      closeTemplateModal();
    } catch (err) {
      console.error('Erro ao salvar template:', err);
      toast.error('Erro ao salvar template de inspeção.');
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

  const calculateProgress = () => {
    const total = template.reduce((acc, category) => {
      return acc + category.items.length;
    }, 0);

    if (total === 0) return 0;

    const answered = template.reduce((acc, category) => {
      const answeredInCategory = category.items.filter(item => {
        return checklistData[item]?.status !== null && checklistData[item]?.status !== undefined;
      }).length;

      return acc + answeredInCategory;
    }, 0);

    return Math.round((answered / total) * 100);
  };

  const handleSubmit = async () => {
    if (!selectedMachine || !user) return;

    // Validate NOK items have observations
    // 🚨 Bloquear finalização se não estiver 100%
    if (calculateProgress() < 100) {
      toast.error('Você precisa concluir 100% do checklist antes de finalizar.');
      return;
    }
    const nokItemsWithoutObs = Object.entries(checklistData).filter(
      ([_, val]: [string, ChecklistItem]) => val.status === 'nok' && !val.observation?.trim()
    );

    if (nokItemsWithoutObs.length > 0) {
      setNokItemsToConfirm(nokItemsWithoutObs.map(([item]) => item));
      setShowNokConfirmDialog(true);
      return;
    }

    // Se não tem NOK sem descrição, salva normalmente
    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    try {
      // Save directly to Supabase using createChecklist function
      await createChecklist({
        machine_id: selectedMachine.id,
        operator_id: user.id,
        date: new Date().toISOString(),
        data: checklistData,
        status: 'completed'
      });

      toast.success('Checklist salvo com sucesso!');
      setSelectedMachine(null);
      setChecklistData({});
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao salvar checklist. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSaveWithoutNokDescriptions = async () => {
    setShowNokConfirmDialog(false);
    await performSave();
  };

  // ...existing code...

  const progress = calculateProgress();

  // Modal de confirmação para NOK sem descrição
  const NokConfirmDialog = () => {
    if (!showNokConfirmDialog) return null;

    return (
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in scale-95 duration-200">
          {/* Header com ícone */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 p-6 flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-100">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Confirmação</h3>
              <p className="text-sm text-slate-600 mt-1">Itens sem descrição detectados</p>
            </div>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6 space-y-4">
            <p className="text-slate-700 leading-relaxed">
              Os itens abaixo foram marcados como <span className="font-semibold text-red-600">NOK</span> mas ainda não possuem descrição:
            </p>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 space-y-2">
              {nokItemsToConfirm.map((item, idx) => (
                <div key={idx} className="text-sm text-slate-700 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                Deseja <span className="font-semibold">finalizar mesmo sem adicionar</span> descrição para esses problemas?
              </p>
            </div>
          </div>
          
          {/* Footer com botões */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
            <button
              onClick={() => setShowNokConfirmDialog(false)}
              className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-all duration-200 hover:border-slate-400"
            >
              Não, voltar
            </button>
            <button
              onClick={handleConfirmSaveWithoutNokDescriptions}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Sim, finalizar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  try {
    return (
      <>
        <NokConfirmDialog />
        <Layout>
        {!selectedMachine ? (
          // TELA DE SELEÇÃO
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Checklist Mensal</h2>
              <div className="flex items-center gap-2">
                <Link
                  to="/checklist-history"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                >
                  <Calendar size={18} /> Ver Histórico
                </Link>
                {isAdmin && (
                  <button
                    onClick={openTemplateModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                  >
                    <Settings size={18} /> Cadastrar Inspecao
                  </button>
                )}
              </div>
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
          </div>
        ) : (
          // TELA DO CHECKLIST
        <div className="max-w-6xl mx-auto pb-24">
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

          {/* Grid: Checklist e Histórico */}
          <div className="space-y-8">
            {/* Checklist */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Itens a Verificar</h3>
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
                    {openCategory === category.category && (
                      <div className="overflow-hidden">
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
                                  {(current.status === 'nok' || current.status === 'ok' || current.observation) && (
                                    <div className="relative mt-2">
                                      {current.status === 'nok' ? (
                                        <AlertCircle className="absolute left-3 top-3 text-red-500" size={18} />
                                      ) : (
                                        <CheckCircle className="absolute left-3 top-3 text-emerald-500" size={18} />
                                      )}
                                      <textarea
                                        placeholder={current.status === 'nok' ? 'Descreva o problema (obrigatório para NOK)...' : 'Adicione uma observação (opcional)...'}
                                        value={current.observation}
                                        onChange={(e) => handleObservationChange(item, e.target.value)}
                                        className={clsx(
                                          'w-full pl-10 p-3 rounded-lg border text-slate-700 text-sm outline-none resize-none',
                                          current.status === 'nok'
                                            ? 'border-red-200 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                            : 'border-emerald-200 bg-emerald-50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                                        )}
                                        rows={2}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botão Finalizar */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Salvando...' : (
                    <>
                      <Save size={20} /> Finalizar Inspeção
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Histórico agora está na página inicial, removido daqui */}
          </div>
        </div>
      )}

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Cadastro de Inspecao</h3>
                <p className="text-sm text-slate-500">Configure um template por modelo de equipamento</p>
              </div>
              <button onClick={closeTemplateModal} className="text-slate-500 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Modelo da maquina</label>
                  {!isNewModelMode ? (
                    <div className="flex gap-2">
                      <select
                        value={editingModel || ''}
                        onChange={(e) => setEditingModel(e.target.value || null)}
                        className="flex-1 p-3 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                      >
                        <option value="">Selecione um modelo</option>
                        {availableModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsNewModelMode(true)}
                        className="px-4 rounded-lg border border-slate-300 hover:bg-slate-50"
                      >
                        Novo
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="Ex: BH180"
                        className="flex-1 p-3 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                      />
                      <button
                        onClick={() => setIsNewModelMode(false)}
                        className="px-4 rounded-lg border border-slate-300 hover:bg-slate-50"
                      >
                        Voltar
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nova categoria</label>
                  <div className="flex gap-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Sistema hidraulico"
                      className="flex-1 p-2.5 rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={addCategory}
                      className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1"
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-3">Categorias e Itens</h4>
                <div className="space-y-3">
                  {templateItems.length === 0 && (
                    <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
                      Nenhuma categoria adicionada ainda.
                    </div>
                  )}
                  {templateItems.map((cat, categoryIndex) => (
                    <div key={`${cat.category}-${categoryIndex}`} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <input
                          value={cat.category}
                          onChange={(e) => {
                            const value = e.target.value;
                            setTemplateItems(prev => prev.map((c, i) => i === categoryIndex ? { ...c, category: value } : c));
                          }}
                          className="font-semibold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:outline-none w-full"
                        />
                        <button onClick={() => removeCategory(categoryIndex)} className="text-red-600 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-2 mb-2">
                        {cat.items.map((item, itemIndex) => (
                          <div key={`${item}-${itemIndex}`} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <span>{item}</span>
                            <button
                              onClick={() => removeItemFromCategory(categoryIndex, itemIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={newItemByCategory[categoryIndex] || ''}
                          onChange={(e) => setNewItemByCategory(prev => ({ ...prev, [categoryIndex]: e.target.value }))}
                          placeholder="Adicionar item da inspeção"
                          className="flex-1 p-2.5 rounded-lg border border-slate-200"
                        />
                        <button
                          onClick={() => addItemToCategory(categoryIndex)}
                          className="px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button onClick={closeTemplateModal} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium">
                Cancelar
              </button>
              <button onClick={handleSaveTemplate} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold">
                Salvar Inspecao
              </button>
            </div>
          </div>
        </div>
      )}
        </Layout>
      </>
    );
  } catch (err) {
    console.error('Erro de render no Checklist:', err);
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao renderizar o checklist</h2>
          <p className="text-red-700 mb-4">Ocorreu um erro inesperado ao carregar a tela. Tente recarregar.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Recarregar página
          </button>
        </div>
      </Layout>
    );
  }
}
