import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, MinusCircle, ChevronRight, Save, Calendar, ChevronDown, ChevronUp, AlertCircle, Plus, Trash2, Settings, Monitor, Minimize2 } from 'lucide-react';
import clsx from 'clsx';
import {
  getMachines,
  getChecklistTemplateByModel,
  createChecklist,
  getChecklists,
  getServiceOrders,
  getUsers,
  getChecklistSchedules,
  createChecklistSchedule,
  completeChecklistSchedulesForMachine,
  updateChecklistScheduleStatus,
} from '../lib/supabaseApi';
import { getOfflineChecklistSyncSummary } from '../lib/offlineChecklist';
import { supabase } from '../lib/supabase';
import { showBrowserNotification } from '../lib/browserNotifications';
import { canAccessChecklistNotifications, isAdminUser, MODULES, hasModuleAccess } from '../lib/permissions';

interface ChecklistSchedule {
  id: number | string;
  machine_id: number;
  machine_name: string;
  operator_id: number;
  operator_name: string;
  scheduled_date: string;
  notes?: string;
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled';
  confirmed_at?: string | null;
  confirmed_by?: number | null;
  confirmed_by_name?: string | null;
  completed_at?: string | null;
  completed_checklist_id?: number | string | null;
  created_by_name: string;
}

interface ChecklistOperator {
  id: number;
  name: string;
  allowed_modules: number[];
  role: 'admin' | 'operator';
}

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

interface TvServiceOrderSummary {
  id: number;
  status: 'open' | 'closed' | string;
  created_at: string | null;
  start_time: string;
  end_time: string | null;
  operator_id: number;
}

interface TvChecklistSummary {
  status: string;
  date: string;
  operator_id: number;
}

function toChecklistObject(value: unknown): Record<string, ChecklistItem> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, ChecklistItem>;
  }
  return {};
}

function toSafeDate(value: unknown): Date {
  const parsed = new Date(typeof value === 'string' && value ? value : Date.now());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function Checklist() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const canReceiveChecklistAlerts = canAccessChecklistNotifications(user);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [template, setTemplate] = useState<TemplateCategory[]>([]);
  const [checklistData, setChecklistData] = useState<ChecklistData>({});
  const [checklistStartedAt, setChecklistStartedAt] = useState<string | null>(null);
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
  const [syncSummary, setSyncSummary] = useState({ pending: 0, error: 0, online: true });
  const [operators, setOperators] = useState<ChecklistOperator[]>([]);
  const [schedules, setSchedules] = useState<ChecklistSchedule[]>([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvOrders, setTvOrders] = useState<TvServiceOrderSummary[]>([]);
  const [tvChecklists, setTvChecklists] = useState<TvChecklistSummary[]>([]);
  const [tvLiveNotice, setTvLiveNotice] = useState<string | null>(null);
  const tvMetricsRef = useRef<{ openOrders: number; pendingChecklists: number } | null>(null);
  const tvNoticeTimerRef = useRef<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    operator_id: '',
    machine_id: '',
    scheduled_date: '',
    notes: '',
  });
  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    const refreshSyncSummary = async () => {
      const summary = await getOfflineChecklistSyncSummary();
      setSyncSummary(summary);
    };

    void refreshSyncSummary();

    const interval = setInterval(() => {
      void refreshSyncSummary();
    }, 8000);

    const handleOnline = () => {
      void refreshSyncSummary();
    };

    const handleOffline = () => {
      void refreshSyncSummary();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  const loadSchedules = async () => {
    if (!user) return;

    try {
      const data = await getChecklistSchedules({
        operatorId: isAdmin ? undefined : user.id,
        includePast: true,
      });
      setSchedules(data as ChecklistSchedule[]);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      setSchedules([]);
    }
  };

  const loadOperators = async () => {
    if (!isAdmin) return;

    try {
      const data = await getUsers();
      const eligible = (data || []).filter((item) => {
        if (isAdminUser(item)) return false;
        return hasModuleAccess(item, MODULES.CHECKLIST);
      });

      setOperators(
        eligible.map((item) => ({
          id: item.id,
          name: item.name,
          allowed_modules: item.allowed_modules || [],
          role: item.role,
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar operadores:', err);
      setOperators([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadSchedules();
    void loadOperators();
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTvMode) {
        setIsTvMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isTvMode]);

  useEffect(() => {
    if (!isTvMode || !user) return;

    const interval = setInterval(() => {
      void loadSchedules();
    }, 30000);

    return () => clearInterval(interval);
  }, [isTvMode, user?.id, isAdmin]);

  useEffect(() => {
    if (!isTvMode || !user) return;

    let isMounted = true;

    const loadTvPanelData = async () => {
      try {
        const [ordersData, checklistData] = await Promise.all([getServiceOrders(), getChecklists()]);
        if (!isMounted) return;

        setTvOrders(
          (ordersData || []).map((order) => ({
            id: order.id,
            status: String(order.status || 'open'),
            created_at: order.created_at ? String(order.created_at) : null,
            start_time: String(order.start_time || new Date().toISOString()),
            end_time: order.end_time ? String(order.end_time) : null,
            operator_id: Number(order.operator_id || 0),
          }))
        );

        setTvChecklists(
          (checklistData || []).map((item: any) => ({
            status: String(item.status || 'pending'),
            date: String(item.date || item.created_at || new Date().toISOString()),
            operator_id: Number(item.operator_id || 0),
          }))
        );
      } catch (err) {
        console.error('Erro ao carregar painel do modo TV:', err);
      }
    };

    void loadTvPanelData();
    const interval = setInterval(() => {
      void loadTvPanelData();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isTvMode, user?.id, isAdmin]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (isTvMode) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isTvMode]);

  useEffect(() => {
    if (!user || isAdmin || !canReceiveChecklistAlerts) return;

    const todayIso = new Date().toISOString().slice(0, 10);
    const dueToday = schedules.filter(
      (item) =>
        item.operator_id === user.id &&
        item.status === 'confirmed' &&
        item.scheduled_date === todayIso
    );

    const upcomingCount = schedules.filter(
      (item) =>
        item.operator_id === user.id &&
        item.status === 'confirmed' &&
        item.scheduled_date >= todayIso
    ).length;

    const dedupeKey = `checklist-schedule-alert:${user.id}:${todayIso}`;
    if (localStorage.getItem(dedupeKey) === '1') return;

    if (dueToday.length > 0) {
      toast.info(`Você tem ${dueToday.length} checklist(s) agendado(s) para hoje.`);
      if (typeof document !== 'undefined' && document.hidden) {
        showBrowserNotification(
          'Checklist Agendado',
          `Você tem ${dueToday.length} checklist(s) agendado(s) para hoje.`,
          { tag: `checklist-schedule-${user.id}`, navigateTo: '/checklist' }
        );
      }
      localStorage.setItem(dedupeKey, '1');
      return;
    }

    if (upcomingCount > 0) {
      toast.info(`Você possui ${upcomingCount} checklist(s) agendado(s).`);
      localStorage.setItem(dedupeKey, '1');
    }
  }, [schedules, user, isAdmin, canReceiveChecklistAlerts]);

  const handleCreateSchedule = async () => {
    if (!user || !isAdmin) return;

    const operatorId = Number(scheduleForm.operator_id);
    const machineId = Number(scheduleForm.machine_id);
    const scheduledDate = scheduleForm.scheduled_date;

    if (!operatorId || !machineId || !scheduledDate) {
      toast.error('Preencha operador, máquina e data do agendamento.');
      return;
    }

    const operator = operators.find((item) => item.id === operatorId);
    const machine = machines.find((item) => item.id === machineId);

    if (!operator || !machine) {
      toast.error('Operador ou máquina inválida para agendamento.');
      return;
    }

    try {
      setIsCreatingSchedule(true);
      const result = await createChecklistSchedule({
        operator_id: operator.id,
        operator_name: operator.name,
        machine_id: machine.id,
        machine_name: machine.name,
        scheduled_date: scheduledDate,
        notes: scheduleForm.notes.trim(),
        created_by_id: user.id,
        created_by_name: user.name,
      });

      if (!result) {
        toast.error('Não foi possível criar o agendamento.');
        return;
      }

      toast.success('Agendamento criado como rascunho. Confirme pelo PCM para liberar a execução.');
      setScheduleForm({ operator_id: '', machine_id: '', scheduled_date: '', notes: '' });
      await loadSchedules();
    } catch (err) {
      console.error('Erro ao criar agendamento:', err);
      toast.error('Erro ao criar agendamento.');
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const openTvMode = async () => {
    setIsTvMode(true);

    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy; keep fixed TV overlay mode.
    }
  };

  const closeTvMode = async () => {
    setIsTvMode(false);

    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen exit errors.
    }
  };

  const handleConfirmSchedule = async (scheduleId: number | string) => {
    if (!user || !isAdmin) return;

    try {
      const result = await updateChecklistScheduleStatus({
        scheduleId,
        status: 'confirmed',
        actingUserId: user.id,
        actingUserName: user.name,
      });

      if (!result) {
        toast.error('Não foi possível confirmar o agendamento.');
        return;
      }

      toast.success('Agendamento confirmado pelo PCM.');
      await loadSchedules();
    } catch (err) {
      console.error('Erro ao confirmar agendamento:', err);
      toast.error('Erro ao confirmar agendamento.');
    }
  };

  const handleCancelSchedule = async (scheduleId: number | string) => {
    if (!user || !isAdmin) return;

    try {
      const result = await updateChecklistScheduleStatus({
        scheduleId,
        status: 'cancelled',
        actingUserId: user.id,
        actingUserName: user.name,
      });

      if (!result) {
        toast.error('Não foi possível cancelar o agendamento.');
        return;
      }

      toast.success('Agendamento cancelado.');
      await loadSchedules();
    } catch (err) {
      console.error('Erro ao cancelar agendamento:', err);
      toast.error('Erro ao cancelar agendamento.');
    }
  };

  const visibleSchedules = schedules
    .filter((item) => {
      if (selectedCalendarDay && item.scheduled_date !== selectedCalendarDay) return false;
      if (!isAdmin && user && item.operator_id !== user.id) return false;
      if (!isAdmin && item.status === 'draft') return false;
      return true;
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

  const monthStart = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const monthEnd = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const scheduleCountByDay = schedules.reduce<Record<string, number>>((acc, item) => {
    if (!isAdmin && item.status === 'draft') {
      return acc;
    }
    acc[item.scheduled_date] = (acc[item.scheduled_date] || 0) + 1;
    return acc;
  }, {});

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plusThirty = new Date(today);
  plusThirty.setDate(plusThirty.getDate() + 30);

  const upcomingThirtyDaysSchedules = schedules
    .filter((item) => {
      if (!isAdmin && user && item.operator_id !== user.id) return false;
      if (!isAdmin && item.status === 'draft') return false;
      if (item.status === 'cancelled') return false;

      const timestamp = new Date(`${item.scheduled_date}T00:00:00`).getTime();
      if (!Number.isFinite(timestamp)) return false;

      return timestamp >= today.getTime() && timestamp <= plusThirty.getTime();
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());

  const selectedDaySchedules = selectedCalendarDay
    ? schedules
        .filter((item) => {
          if (item.scheduled_date !== selectedCalendarDay) return false;
          if (!isAdmin && user && item.operator_id !== user.id) return false;
          if (!isAdmin && item.status === 'draft') return false;
          return true;
        })
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    : [];

  const activeScheduleForSelectedMachine = selectedMachine && user
    ? schedules
        .filter((item) => {
          if (item.machine_id !== selectedMachine.id) return false;
          if (!isAdmin && item.operator_id !== user.id) return false;
          return item.status === 'confirmed';
        })
        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())[0] || null
    : null;

  const tvVisibleOrders = user
    ? isAdmin
      ? tvOrders
      : tvOrders.filter((order) => order.operator_id === user.id)
    : [];

  const tvOpenOrders = tvVisibleOrders.filter((order) => order.status === 'open').length;
  const tvOverdueOrders = tvVisibleOrders.filter((order) => {
    if (order.status !== 'open') return false;
    const startedAt = new Date(order.start_time).getTime();
    if (!Number.isFinite(startedAt)) return false;
    return Date.now() - startedAt > 24 * 60 * 60 * 1000;
  }).length;
  const tvClosedToday = tvVisibleOrders.filter((order) => {
    if (order.status !== 'closed' || !order.end_time) return false;
    return toSafeDate(order.end_time).getTime() >= today.getTime();
  }).length;

  const tvQueueWaitAveragesMs = tvVisibleOrders
    .map((order) => {
      const createdAt = order.created_at ? new Date(order.created_at).getTime() : NaN;
      const startedAt = new Date(order.start_time).getTime();
      if (!Number.isFinite(createdAt) || !Number.isFinite(startedAt)) return null;
      if (startedAt <= createdAt) return null;
      return startedAt - createdAt;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0);

  const tvAverageQueueWaitMs = tvQueueWaitAveragesMs.length
    ? Math.round(tvQueueWaitAveragesMs.reduce((sum, value) => sum + value, 0) / tvQueueWaitAveragesMs.length)
    : null;

  const formatTvQueueDuration = (ms: number | null) => {
    if (ms === null || !Number.isFinite(ms)) return '--';
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const tvVisibleChecklists = isAdmin
    ? tvChecklists
    : tvChecklists.filter((entry) => entry.operator_id === user?.id);
  const tvPendingChecklists = tvVisibleChecklists.filter((entry) => entry.status !== 'completed').length;
  const tvCompletedToday = tvVisibleChecklists.filter((entry) => {
    if (entry.status !== 'completed') return false;
    return toSafeDate(entry.date).getTime() >= today.getTime();
  }).length;
  const tvCompletionRate = tvVisibleChecklists.length
    ? (tvVisibleChecklists.filter((entry) => entry.status === 'completed').length / tvVisibleChecklists.length) * 100
    : 0;

  useEffect(() => {
    if (!isTvMode) {
      tvMetricsRef.current = null;
      if (tvNoticeTimerRef.current) {
        window.clearTimeout(tvNoticeTimerRef.current);
        tvNoticeTimerRef.current = null;
      }
      setTvLiveNotice(null);
      return;
    }

    const previous = tvMetricsRef.current;
    const current = {
      openOrders: tvOpenOrders,
      pendingChecklists: tvPendingChecklists,
    };

    if (previous) {
      if (current.openOrders > previous.openOrders) {
        setTvLiveNotice('Nova O.S entrou agora no sistema.');
      } else if (current.pendingChecklists > previous.pendingChecklists) {
        setTvLiveNotice('Novo checklist pendente detectado.');
      }

      if (tvLiveNotice && tvNoticeTimerRef.current) {
        window.clearTimeout(tvNoticeTimerRef.current);
      }

      if (tvLiveNotice || current.openOrders > previous.openOrders || current.pendingChecklists > previous.pendingChecklists) {
        tvNoticeTimerRef.current = window.setTimeout(() => {
          setTvLiveNotice(null);
          tvNoticeTimerRef.current = null;
        }, 6000);
      }
    }

    tvMetricsRef.current = current;
  }, [isTvMode, tvOpenOrders, tvPendingChecklists, tvLiveNotice]);

  const getStatusLabel = (status: ChecklistSchedule['status']) => {
    if (status === 'draft') return 'Rascunho';
    if (status === 'confirmed') return 'Confirmado';
    if (status === 'completed') return 'Concluido';
    if (status === 'cancelled') return 'Cancelado';
    return 'Rascunho';
  };

  const getStatusClass = (status: ChecklistSchedule['status']) => {
    if (status === 'draft') return 'bg-amber-100 text-amber-700';
    if (status === 'confirmed') return 'bg-blue-100 text-blue-700';
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-amber-100 text-amber-700';
  };

  const getTvStatusClass = (status: ChecklistSchedule['status']) => {
    if (status === 'draft') return 'bg-amber-100 text-amber-700';
    if (status === 'confirmed') return 'bg-lime-100 text-lime-700';
    if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
    if (status === 'cancelled') return 'bg-red-100 text-red-700';
    return 'bg-lime-100 text-lime-700';
  };

  useEffect(() => {
    if (editingModel) {
      loadTemplate(editingModel);
    }
  }, [editingModel]);

  useEffect(() => {
    if (selectedMachine) {
      loadTemplate(selectedMachine.model);
      setChecklistStartedAt(new Date().toISOString());
    } else {
      setTemplate([]);
      setChecklistStartedAt(null);
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
      const result = await createChecklist({
        machine_id: selectedMachine.id,
        operator_id: user.id,
        date: new Date().toISOString(),
        data: checklistData,
        status: 'completed',
        checklist_started_at: checklistStartedAt,
        checklist_finished_at: new Date().toISOString(),
        schedule_id: activeScheduleForSelectedMachine?.id ?? null,
        schedule_confirmed_at: activeScheduleForSelectedMachine?.confirmed_at ?? null,
        schedule_confirmed_by: activeScheduleForSelectedMachine?.confirmed_by ?? null,
        schedule_confirmed_by_name: activeScheduleForSelectedMachine?.confirmed_by_name ?? null,
      });

      if (result?.__sync === 'pending') {
        toast.success('Checklist salvo no dispositivo. Será enviado quando houver internet.');
      } else {
        toast.success('Checklist salvo e sincronizado com sucesso!');
      }

      const summary = await getOfflineChecklistSyncSummary();
      setSyncSummary(summary);
      await completeChecklistSchedulesForMachine(user.id, selectedMachine.id, result?.id ?? null);
      await loadSchedules();
      setSelectedMachine(null);
      setChecklistData({});
      setChecklistStartedAt(null);
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
        {isTvMode && (
          <div className="fixed inset-0 z-[90] bg-gradient-to-br from-emerald-100 via-white to-emerald-50 text-slate-900 p-4 md:p-6 overflow-hidden">
            {tvLiveNotice && (
              <div className="fixed top-24 right-6 z-[95] pointer-events-none max-w-sm">
                <div className="rounded-xl border border-emerald-300 bg-white/95 backdrop-blur px-4 py-3 shadow-lg flex items-start gap-2 animate-pulse">
                  <AlertCircle size={16} className="text-emerald-700 mt-0.5" />
                  <p className="text-sm font-medium text-slate-700">{tvLiveNotice}</p>
                </div>
              </div>
            )}
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-emerald-200 pb-4 mb-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">Checklist Mensal - Modo TV</h2>
                  <p className="text-slate-600 text-sm md:text-base">Visão de agendamentos para comunicação com a equipe</p>
                </div>
                <button
                  onClick={closeTvMode}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <Minimize2 size={16} /> Sair do modo TV
                </button>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0">
                <div className="xl:col-span-8 flex flex-col gap-4 min-h-0">
                  <div className="bg-white border border-emerald-200 rounded-2xl p-4 md:p-5 flex flex-col min-h-0 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg md:text-xl font-semibold">Calendário de Agendamentos</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                          className="px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        >
                          &larr;
                        </button>
                        <div className="text-sm md:text-base font-semibold min-w-[160px] text-center capitalize">
                          {calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </div>
                        <button
                          onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                          className="px-3 py-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        >
                          &rarr;
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs md:text-sm font-semibold text-emerald-800 mb-2">
                      <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sab</div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: firstWeekday }).map((_, idx) => (
                        <div key={`tv-empty-${idx}`} className="h-20 md:h-24 rounded-lg bg-emerald-50 border border-emerald-100" />
                      ))}

                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const day = idx + 1;
                        const dayIso = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const count = scheduleCountByDay[dayIso] || 0;
                        const isSelected = selectedCalendarDay === dayIso;
                        const isToday = dayIso === new Date().toISOString().slice(0, 10);

                        return (
                          <button
                            key={`tv-${dayIso}`}
                            onClick={() => setSelectedCalendarDay((prev) => (prev === dayIso ? null : dayIso))}
                            className={clsx(
                              'h-20 md:h-24 rounded-lg border p-2 text-left transition-colors',
                              isSelected
                                ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={clsx(
                                  'text-sm md:text-base font-semibold',
                                  isSelected ? 'text-white' : isToday ? 'text-emerald-700' : 'text-slate-700'
                                )}
                              >
                                {day}
                              </span>
                              {count > 0 && (
                                <span
                                  className={clsx(
                                    'text-xs px-2 py-0.5 rounded-full font-semibold',
                                    isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-600 text-white'
                                  )}
                                >
                                  {count}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 border-t border-emerald-100 pt-3 overflow-auto min-h-0">
                      {selectedCalendarDay && (
                        <div className="text-sm text-slate-700 mb-2 font-semibold">
                          {`Agendamentos do dia ${new Date(`${selectedCalendarDay}T00:00:00`).toLocaleDateString('pt-BR')}`}
                        </div>
                      )}
                      {selectedCalendarDay && selectedDaySchedules.length === 0 && (
                        <div className="text-sm text-slate-500">Sem agendamentos neste dia.</div>
                      )}
                      {selectedDaySchedules.length > 0 && (
                        <div className="space-y-2">
                          {selectedDaySchedules.map((item) => (
                            <div key={`tv-day-${String(item.id)}`} className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-sm">
                              <div className="font-semibold text-slate-800">{item.machine_name} | {item.operator_name}</div>
                              {item.notes && <div className="text-slate-600">Obs: {item.notes}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-2xl p-4 md:p-5 shadow-sm">
                    <h3 className="text-lg md:text-xl font-semibold mb-1">Painel de Controle</h3>
                    <p className="text-slate-600 text-sm mb-3">Indicadores de O.S</p>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs text-slate-600">Abertas</p>
                        <p className="text-2xl font-bold text-emerald-700">{tvOpenOrders}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs text-slate-600">Em atraso</p>
                        <p className="text-2xl font-bold text-amber-600">{tvOverdueOrders}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs text-slate-600">Finalizadas hoje</p>
                        <p className="text-2xl font-bold text-emerald-700">{tvClosedToday}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs text-slate-600">Media de fila</p>
                        <p className="text-2xl font-bold text-emerald-700">{formatTvQueueDuration(tvAverageQueueWaitMs)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-4 min-h-0">
                  <div className="bg-white border border-emerald-200 rounded-2xl p-4 md:p-5 flex flex-col min-h-0 shadow-sm">
                    <h3 className="text-lg md:text-xl font-semibold mb-1">Proximos 30 dias</h3>
                    <p className="text-slate-600 text-sm mb-3">Todos os agendamentos para acompanhamento da equipe</p>

                    <div className="space-y-2 overflow-auto pr-1 min-h-0">
                      {upcomingThirtyDaysSchedules.length === 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-slate-600 text-sm">
                          Nenhum agendamento para os proximos 30 dias.
                        </div>
                      )}

                      {upcomingThirtyDaysSchedules.map((item) => (
                        <div key={`tv-list-${String(item.id)}`} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-800">{item.machine_name}</div>
                            <span className={clsx('text-xs px-2 py-1 rounded-full', getTvStatusClass(item.status))}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            {new Date(`${item.scheduled_date}T00:00:00`).toLocaleDateString('pt-BR')} | {item.operator_name}
                          </div>
                          {item.notes && <div className="text-xs text-slate-500 mt-1">Obs: {item.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                    <Settings size={18} /> Cadastrar Inspeção
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={openTvMode}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-slate-800/20 flex items-center gap-2 transition-all"
                  >
                    <Monitor size={18} /> Modo TV
                  </button>
                )}
              </div>
            </div>

            <div className={clsx(
              'mb-6 rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3',
              syncSummary.online ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            )}>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {syncSummary.online ? 'Online' : 'Offline'}
                </p>
                <p className="text-xs text-slate-600">
                  {syncSummary.online
                    ? 'Os checklists pendentes serão sincronizados automaticamente.'
                    : 'Os checklists serão salvos no dispositivo e enviados ao reconectar.'}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Calendário de Agendamento de Checklist</h3>
                  <p className="text-sm text-slate-500">
                    {isAdmin
                      ? 'Defina data, máquina e operador para o checklist mensal.'
                      : 'Visualize seus agendamentos de checklist definidos pelo administrador.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    &larr;
                  </button>
                  <div className="text-sm font-semibold text-slate-700 min-w-[130px] text-center">
                    {calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </div>
                  <button
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
                  <select
                    value={scheduleForm.operator_id}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, operator_id: e.target.value }))}
                    className="md:col-span-1 p-2.5 border border-slate-200 rounded-lg"
                  >
                    <option value="">Operador</option>
                    {operators.map((operator) => (
                      <option key={operator.id} value={operator.id}>{operator.name}</option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.machine_id}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, machine_id: e.target.value }))}
                    className="md:col-span-1 p-2.5 border border-slate-200 rounded-lg"
                  >
                    <option value="">Máquina</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>{machine.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduled_date: e.target.value }))}
                    className="md:col-span-1 p-2.5 border border-slate-200 rounded-lg"
                  />

                  <input
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observação (opcional)"
                    className="md:col-span-1 p-2.5 border border-slate-200 rounded-lg"
                  />

                  <button
                    onClick={handleCreateSchedule}
                    disabled={isCreatingSchedule}
                    className="md:col-span-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold px-4 py-2.5 disabled:opacity-60"
                  >
                    {isCreatingSchedule ? 'Agendando...' : 'Agendar'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 mb-1">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sab</div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-14 rounded-lg bg-slate-50" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dayIso = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const count = scheduleCountByDay[dayIso] || 0;
                  const isSelected = selectedCalendarDay === dayIso;

                  return (
                    <button
                      key={dayIso}
                      onClick={() => setSelectedCalendarDay((prev) => (prev === dayIso ? null : dayIso))}
                      className={clsx(
                        'h-14 rounded-lg border text-left px-2 py-1 transition-colors',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="text-xs font-semibold text-slate-700">{day}</div>
                      {count > 0 && (
                        <div className="mt-1 inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                          {count}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-700">
                    {selectedCalendarDay
                      ? `Agendamentos em ${new Date(`${selectedCalendarDay}T00:00:00`).toLocaleDateString('pt-BR')}`
                      : 'Proximos agendamentos'}
                  </h4>
                  {selectedCalendarDay && (
                    <button
                      onClick={() => setSelectedCalendarDay(null)}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Limpar filtro do dia
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {visibleSchedules.length === 0 && (
                    <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      Nenhum agendamento encontrado para o filtro atual.
                    </div>
                  )}
                  {visibleSchedules.map((item) => (
                    <div key={String(item.id)} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-800 text-sm">{item.machine_name}</div>
                        <span className={clsx(
                          'text-xs px-2 py-1 rounded-full',
                          getStatusClass(item.status)
                        )}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Data: {new Date(`${item.scheduled_date}T00:00:00`).toLocaleDateString('pt-BR')} | Operador: {item.operator_name}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-slate-600 mt-1">Obs: {item.notes}</div>
                      )}
                      {item.confirmed_at && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          Confirmado em {new Date(item.confirmed_at).toLocaleString('pt-BR')}
                          {item.confirmed_by_name ? ` por ${item.confirmed_by_name}` : ''}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-500">Agendado por {item.created_by_name}</div>
                          <div className="flex flex-wrap gap-2">
                            {item.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => void handleConfirmSchedule(item.id)}
                                className="rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                              >
                                Confirmar PCM
                              </button>
                            )}
                            {item.status !== 'completed' && item.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => void handleCancelSchedule(item.id)}
                                className="rounded-md bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
        <div className="max-w-6xl mx-auto pb-24 px-0 sm:px-4">
          {/* Header */}
          <div className="bg-white p-4 sm:p-6 rounded-none sm:rounded-2xl shadow-sm border-b sm:border border-slate-100 mb-6 sticky top-0 sm:top-4 z-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex-1">
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 active:bg-emerald-50 px-2 py-1 rounded-lg transition-colors mb-2 sm:-ml-2"
                >
                  <ChevronLeft size={18} /> <span>Trocar Equipamento</span>
                </button>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{selectedMachine.name}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {checklistStartedAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-100 shadow-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      Iniciado: {new Date(checklistStartedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {activeScheduleForSelectedMachine ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 border border-blue-100 shadow-sm">
                      Agenda: {new Date(`${activeScheduleForSelectedMachine.scheduled_date}T00:00:00`).toLocaleDateString('pt-BR')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 border border-amber-100 shadow-sm">
                      Sem agenda vinculada
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center p-3 sm:p-0 bg-slate-50 sm:bg-transparent rounded-xl border sm:border-0 border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider sm:mb-1">Progresso Geral</div>
                <div className="text-3xl font-black text-emerald-600 leading-none">{progress}%</div>
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner flex-shrink-0">
              <div
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-700 ease-out"
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
                              const hasDescription = Boolean(current.observation?.trim());
                              const statusLabel =
                                current.status === 'ok'
                                  ? 'OK'
                                  : current.status === 'nok'
                                    ? 'NOK'
                                    : current.status === 'na'
                                      ? 'N/A'
                                      : 'Pendente';

                              return (
                                <div
                                  key={itemIndex}
                                  className={clsx(
                                    'p-5 transition-colors',
                                    current.status === 'nok'
                                      ? 'bg-red-50/50'
                                      : current.status === 'ok'
                                        ? 'bg-emerald-50/40'
                                        : 'hover:bg-slate-50/60'
                                  )}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                                    <div className="min-w-0 flex-1">
                                      <span className="font-semibold text-slate-800 text-base block">{item}</span>
                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span
                                          className={clsx(
                                            'text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm transition-all',
                                            current.status === 'ok'
                                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                              : current.status === 'nok'
                                                ? 'bg-red-100 text-red-700 border-red-200'
                                                : current.status === 'na'
                                                  ? 'bg-slate-200 text-slate-700 border-slate-300'
                                                  : 'bg-amber-100 text-amber-800 border-amber-200'
                                          )}
                                        >
                                          Status: {statusLabel}
                                        </span>
                                        <span
                                          className={clsx(
                                            'text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm transition-all',
                                            hasDescription
                                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                                              : 'bg-slate-100 text-slate-600 border-slate-200'
                                          )}
                                        >
                                          {hasDescription ? 'Com descrição' : 'Sem descrição'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-wrap gap-2 sm:self-center">
                                      <button
                                        onClick={() => handleStatusChange(item, 'ok')}
                                        className={clsx(
                                          "flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                          current.status === 'ok'
                                            ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-105"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600"
                                        )}
                                      >
                                        <CheckCircle size={18} /> <span className="hidden sm:inline">OK</span>
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(item, 'nok')}
                                        className={clsx(
                                          "flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                          current.status === 'nok'
                                            ? "bg-red-500 border-red-600 text-white shadow-md shadow-red-500/20 scale-105"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                                        )}
                                      >
                                        <XCircle size={18} /> <span className="hidden sm:inline">NOK</span>
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(item, 'na')}
                                        className={clsx(
                                          "flex-1 sm:flex-none px-3 sm:px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 border",
                                          current.status === 'na'
                                            ? "bg-slate-500 border-slate-600 text-white shadow-md shadow-slate-500/20 scale-105"
                                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700"
                                        )}
                                      >
                                        <MinusCircle size={18} /> <span className="hidden sm:inline">N/A</span>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl sm:rounded-2xl shadow-2xl border border-slate-200 min-h-screen sm:min-h-0 flex flex-col">
            <div className="sticky top-0 z-10 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">Cadastro de Inspeção</h3>
                <p className="text-xs sm:text-sm text-slate-500">Configure um template por modelo de equipamento</p>
              </div>
              <button 
                onClick={closeTemplateModal} 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-colors"
                aria-label="Fechar"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto max-h-none sm:max-h-[75vh]">
              <div className="space-y-6">
                <div className="bg-white p-1 rounded-lg">
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Modelo da máquina</label>
                  {!isNewModelMode ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={editingModel || ''}
                        onChange={(e) => setEditingModel(e.target.value || null)}
                        className="flex-1 p-3.5 sm:p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white text-slate-900 shadow-sm"
                      >
                        <option value="">Selecione um modelo</option>
                        {availableModels.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setIsNewModelMode(true)}
                        className="sm:px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
                      >
                        Novo
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="Ex: BH180"
                        className="flex-1 p-3.5 sm:p-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white text-slate-900 shadow-sm"
                      />
                      <button
                        onClick={() => setIsNewModelMode(false)}
                        className="sm:px-6 py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                      >
                        Voltar
                      </button>
                    </div>
                  )}
                </div>

                <div className="border border-emerald-100 rounded-2xl p-4 sm:p-5 bg-emerald-50/30">
                  <label className="block text-sm font-bold text-emerald-900 mb-3 uppercase tracking-wider">Nova categoria</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Ex: Sistema Hidráulico"
                      className="flex-1 p-3.5 sm:p-3 rounded-xl border border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white shadow-sm"
                    />
                    <button
                      onClick={addCategory}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <Plus size={20} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                  Categorias e Itens
                </h4>
                <div className="space-y-4 pb-4">
                  {templateItems.length === 0 && (
                    <div className="text-sm text-slate-500 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                      <p>Nenhuma categoria adicionada ainda.</p>
                      <p className="mt-1 text-xs">Crie uma categoria acima para começar.</p>
                    </div>
                  )}
                  {templateItems.map((cat, categoryIndex) => (
                    <div key={`${cat.category}-${categoryIndex}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition-colors group">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <input
                            value={cat.category}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTemplateItems(prev => prev.map((c, i) => i === categoryIndex ? { ...c, category: value } : c));
                            }}
                            className="font-bold text-slate-800 bg-transparent border-b-2 border-dashed border-slate-200 focus:border-emerald-400 focus:outline-none w-full py-1 text-lg"
                            placeholder="Nome da categoria"
                          />
                        </div>
                        <button 
                          onClick={() => removeCategory(categoryIndex)} 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Remover Categoria"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="space-y-2 mb-4">
                        {cat.items.map((item, itemIndex) => (
                          <div key={`${item}-${itemIndex}`} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 group/item hover:bg-slate-100 transition-colors">
                            <span className="text-slate-700 font-medium">{item}</span>
                            <button
                              onClick={() => removeItemFromCategory(categoryIndex, itemIndex)}
                              className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover/item:opacity-100 transition-opacity"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          value={newItemByCategory[categoryIndex] || ''}
                          onChange={(e) => setNewItemByCategory(prev => ({ ...prev, [categoryIndex]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (newItemByCategory[categoryIndex] || '').trim()) {
                              addItemToCategory(categoryIndex);
                            }
                          }}
                          placeholder="Adicionar item..."
                          className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                        />
                        <button
                          onClick={() => addItemToCategory(categoryIndex)}
                          className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md transition-all active:scale-95"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-10 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                onClick={closeTemplateModal} 
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveTemplate} 
                disabled={templateItems.length === 0 || (!editingModel && !newModelName)}
                className="w-full sm:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all order-1 sm:order-2"
              >
                Salvar Inspeção
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
