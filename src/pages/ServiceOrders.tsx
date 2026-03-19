import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, CheckCircle, AlertTriangle, Play, Square, X, Package, Search, BookmarkPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';
import { 
  getServiceOrders, 
  getMachines, 
  getPartsTools, 
  createServiceOrder, 
  updateServiceOrder, 
  closeServiceOrder,
  deleteServiceOrdersByScope,
  deleteServiceOrdersByIds,
  verifyUserCredentials,
  createPartTool,
  deletePartTool,
  getUsers,
} from '../lib/supabaseApi';
import { getLocalAuditLogs, isRemoteAuditEnabled, recordAuditAction } from '../lib/audit';
import { getOperationalNotificationRules } from '../lib/notificationRules';
import { supabase } from '../lib/supabase';

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
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  created_at?: string;
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

interface SavedServiceOrdersFilter {
  id: string;
  name: string;
  query: string;
  status: 'all' | 'open' | 'closed';
}

interface AssignableUser {
  id: number;
  name: string;
  role: string;
}

interface OrderRoutingMeta {
  assignedUserId: number | null;
  assignedUserName: string | null;
  queueStartedAt: string | null;
  workStartedAt: string | null;
}

interface ServiceOrderBreakState {
  totalMs: number;
  activeStartMs: number | null;
  activeEndMs: number | null;
  pausedRemainingMs: number | null;
}

const ORDER_BREAKS_STORAGE_KEY = 'service-order-breaks:v1';

function readOrderBreaks(): Record<number, ServiceOrderBreakState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ORDER_BREAKS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ServiceOrderBreakState>;
    const normalized: Record<number, ServiceOrderBreakState> = {};
    Object.entries(parsed || {}).forEach(([key, value]) => {
      const orderId = Number(key);
      if (!Number.isFinite(orderId)) return;
      normalized[orderId] = {
        totalMs: Math.max(0, Number(value?.totalMs || 0)),
        activeStartMs: value?.activeStartMs ? Number(value.activeStartMs) : null,
        activeEndMs: value?.activeEndMs ? Number(value.activeEndMs) : null,
        pausedRemainingMs: value?.pausedRemainingMs ? Math.max(0, Number(value.pausedRemainingMs)) : null,
      };
    });
    return normalized;
  } catch {
    return {};
  }
}

function persistOrderBreaks(breaksByOrder: Record<number, ServiceOrderBreakState>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORDER_BREAKS_STORAGE_KEY, JSON.stringify(breaksByOrder));
}

export default function ServiceOrders() {
  const { user } = useAuth();
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const normalizedUsername = String(user?.username || '').trim().toLowerCase();
  const isAdmin =
    normalizedRole === 'admin' ||
    normalizedRole === 'administrador' ||
    normalizedUsername === 'admin';
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishingOrderId, setFinishingOrderId] = useState<number | null>(null);
  const [finalReport, setFinalReport] = useState('');
  const [showFinishWithoutResolutionConfirm, setShowFinishWithoutResolutionConfirm] = useState(false);
  const [partsTools, setPartsTools] = useState<PartTool[]>([]);
  const [isPartsToolsModalOpen, setIsPartsToolsModalOpen] = useState(false);
  const [newPartTool, setNewPartTool] = useState({ name: '', description: '', category: 'tool' as 'tool' | 'part' });
  const [editReportModalOpen, setEditReportModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [editReport, setEditReport] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editToolsInput, setEditToolsInput] = useState('');
  const [editComponent, setEditComponent] = useState('');
  const [finishReason, setFinishReason] = useState('');
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopeningOrder, setReopeningOrder] = useState<ServiceOrder | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isReopeningOrder, setIsReopeningOrder] = useState(false);
  const [clockMs, setClockMs] = useState<number>(() => Date.now());
  const liveTimerBaseRef = useRef<Record<number, { baseDiffMs: number; baseAtMs: number }>>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isDeletingAllOrders, setIsDeletingAllOrders] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'all' | 'specific'>('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>(isAdmin ? 'open' : 'all');
  const [savedFilters, setSavedFilters] = useState<SavedServiceOrdersFilter[]>([]);
  const [savedFilterName, setSavedFilterName] = useState('');
  const [breakMinutesAllowed, setBreakMinutesAllowed] = useState(15);
  const [orderBreaks, setOrderBreaks] = useState<Record<number, ServiceOrderBreakState>>(() => readOrderBreaks());
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [orderRoutingById, setOrderRoutingById] = useState<Record<number, OrderRoutingMeta>>({});
  const [newOrder, setNewOrder] = useState({
  machine_id: '',
  maintenance_type: 'corretiva' as 'preventiva' | 'corretiva',
  technician_name: '',
  responsible_user_id: 'na',
  component: '',
  description: '',
  used_parts_tools: [] as number[],
  tools: [] as string[],
  toolsInput: ''
});

  const canCreateOrder = Boolean(user);
  const canDeleteOrder = isAdmin;
  const canOpenPartsToolsManager = isAdmin;
  const canExportOrders = isAdmin;

  const canFinalizeOrder = (order: ServiceOrder) => {
    if (!user) return false;
    if (isAdmin) return true;
    return order.operator_id === user.id;
  };

  const canEditOrder = (order: ServiceOrder) => {
    if (!user) return false;
    if (isAdmin) return true;
    return order.operator_id === user.id;
  };

  const canReopenOrder = () => isAdmin;
  useEffect(() => {
    if (!user) return;

    void fetchOrders();
    void fetchMachines();
    void fetchPartsTools();
    void fetchAssignableUsers();
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!user) return;

    const storageKey = `service-orders-filters:${user.id}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedFilters(parsed as SavedServiceOrdersFilter[]);
      }
    } catch {
      setSavedFilters([]);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (isAdmin && statusFilter !== 'open') {
      setStatusFilter('open');
    }
  }, [isAdmin, user?.id, statusFilter]);

  useEffect(() => {
    if (!user) return;

    const refreshBreakRules = () => {
      const rules = getOperationalNotificationRules(user.id, isAdmin);
      setBreakMinutesAllowed(rules.remindEveryMinutes);
    };

    refreshBreakRules();
    const interval = setInterval(refreshBreakRules, 10000);
    return () => clearInterval(interval);
  }, [user?.id, isAdmin]);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setClockMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentIds = new Set(orders.map(order => order.id));
    const cache = liveTimerBaseRef.current;
    Object.keys(cache).forEach((idStr) => {
      const id = Number(idStr);
      if (!currentIds.has(id)) {
        delete cache[id];
      }
    });
  }, [orders]);

  useEffect(() => {
    persistOrderBreaks(orderBreaks);
  }, [orderBreaks]);

  useEffect(() => {
    const openOrderIds = new Set(orders.filter((order) => order.status === 'open').map((order) => order.id));
    setOrderBreaks((prev) => {
      const next: Record<number, ServiceOrderBreakState> = {};
      Object.entries(prev as Record<string, ServiceOrderBreakState>).forEach(([key, value]) => {
        const id = Number(key);
        if (openOrderIds.has(id)) {
          next[id] = value;
        }
      });
      return next;
    });
  }, [orders]);

  useEffect(() => {
    if (!orders.length) {
      setOrderRoutingById({});
      return;
    }

    const parseIso = (value: unknown) => {
      if (!value || typeof value !== 'string') return null;
      const ts = new Date(value).getTime();
      return Number.isFinite(ts) ? value : null;
    };

    const loadRouting = async () => {
      const orderIds = orders.map((order) => order.id);
      const baseRouting: Record<number, OrderRoutingMeta> = {};

      orders.forEach((order) => {
        const assignedId = Number(order.assigned_user_id);
        baseRouting[order.id] = {
          assignedUserId: Number.isFinite(assignedId) && assignedId > 0 ? assignedId : null,
          assignedUserName: order.assigned_user_name || null,
          queueStartedAt: order.created_at || order.start_time || null,
          workStartedAt: null,
        };
      });

      const localRows = getLocalAuditLogs()
        .filter((row) =>
          (row.action === 'service_order_created' || row.action === 'service_order_updated') &&
          typeof row.entity_id === 'number' &&
          orderIds.includes(row.entity_id)
        )
        .map((row) => ({
          entity_id: row.entity_id as number,
          details: row.details,
          user_id: row.user_id,
          user_name: row.user_name,
          created_at: row.created_at,
        }));

      let mergedRows = [...localRows];

      if (isRemoteAuditEnabled()) {
        try {
          const { data, error } = await supabase
            .from('audit_logs')
            .select('action, entity_id, details, user_id, user_name, created_at')
            .in('action', ['service_order_created', 'service_order_updated'])
            .in('entity_id', orderIds)
            .order('created_at', { ascending: true })
            .limit(3000);

          if (!error) {
            const remoteRows = (data || []).map((row: any) => ({
              entity_id: row.entity_id as number,
              details: typeof row.details === 'object' && row.details ? row.details : {},
              user_id: Number(row.user_id || 0),
              user_name: String(row.user_name || ''),
              created_at: String(row.created_at || ''),
            }));

            mergedRows = [...remoteRows, ...localRows];
          }
        } catch {
          // fallback local only
        }
      }

      mergedRows
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .forEach((row) => {
          const orderId = Number(row.entity_id);
          const current = baseRouting[orderId];
          if (!current) return;

          const details = row.details as Record<string, unknown>;
          const assignedUserId = Number(details?.assigned_user_id);
          const assignedUserName = typeof details?.assigned_user_name === 'string' ? details.assigned_user_name : null;
          const queueStartedAt = parseIso(details?.queue_started_at);
          const event = String(details?.event || '').trim();

          if (queueStartedAt) {
            current.queueStartedAt = queueStartedAt;
          }

          if (Number.isFinite(assignedUserId) && assignedUserId > 0) {
            current.assignedUserId = assignedUserId;
            current.assignedUserName = assignedUserName || current.assignedUserName;
          }

          if (event === 'service_order_work_started') {
            current.workStartedAt = parseIso(details?.work_started_at) || row.created_at;
            const startedByUserId = Number(details?.started_by_user_id || row.user_id);
            if (Number.isFinite(startedByUserId) && startedByUserId > 0) {
              current.assignedUserId = startedByUserId;
              current.assignedUserName =
                (typeof details?.started_by_user_name === 'string' ? details.started_by_user_name : null) ||
                row.user_name ||
                current.assignedUserName;
            }
          }
        });

      setOrderRoutingById(baseRouting);
    };

    void loadRouting();
  }, [orders]);

  useEffect(() => {
    if (!Object.keys(orderBreaks).length) return;

    let changed = false;
    const now = Date.now();
    const completedIds: number[] = [];

    const next: Record<number, ServiceOrderBreakState> = { ...orderBreaks };

    Object.entries(orderBreaks as Record<string, ServiceOrderBreakState>).forEach(([key, state]) => {
      const orderId = Number(key);
      if (!state?.activeStartMs || !state?.activeEndMs) return;
      if (now < state.activeEndMs) return;

      const elapsed = Math.max(0, state.activeEndMs - state.activeStartMs);
      next[orderId] = {
        totalMs: Math.max(0, Number(state.totalMs || 0)) + elapsed,
        activeStartMs: null,
        activeEndMs: null,
        pausedRemainingMs: null,
      };
      completedIds.push(orderId);
      changed = true;
    });

    if (changed) {
      setOrderBreaks(next);
      completedIds.forEach((orderId) => {
        toast.info(`Intervalo da O.S #${String(orderId).padStart(4, '0')} finalizado.`);
      });
    }
  }, [clockMs, orderBreaks]);

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
      const scopedOrders = isAdmin
        ? data
        : data.filter((order) => order.operator_id === user?.id);
      setOrders(scopedOrders);
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

  const fetchAssignableUsers = async () => {
    try {
      const rows = await getUsers();
      const filtered = (rows || []).filter((item) => String(item.role || '').toLowerCase() !== 'admin');
      setAssignableUsers(
        filtered.map((item) => ({
          id: item.id,
          name: item.name,
          role: item.role,
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar responsaveis:', err);
      setAssignableUsers([]);
    }
  };


  const handleCreatePartTool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createPartTool(newPartTool);
      if (result) {
        await fetchPartsTools();
        setNewPartTool({ name: '', description: '', category: 'tool' });
        toast.success('Item cadastrado com sucesso!');
      } else {
        toast.error('Erro ao cadastrar.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cadastrar.');
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

    if (!user) {
      toast.error('❌ Usuário não autenticado');
      return;
    }

    const validationError = validateOrderForm();
    if (validationError) {
      toast.error(`❌ ${validationError}`);
      return;
    }

    try {
      const machineId = parseInt(newOrder.machine_id);
      if (Number.isNaN(machineId)) {
        toast.error('❌ Máquina inválida');
        return;
      }
      
      const machine = machines.find(m => m.id === machineId);

      if (!machine) {
        toast.error('❌ Máquina não encontrada');
        return;
      }

      setIsSubmittingOrder(true);

      const selectedResponsible =
        newOrder.responsible_user_id !== 'na'
          ? assignableUsers.find((item) => item.id === Number(newOrder.responsible_user_id))
          : null;

      const technicianName = selectedResponsible ? selectedResponsible.name : 'N/A';
      const queueStartedAt = new Date().toISOString();

      const orderData = {
        machine_id: machineId,
        maintenance_type: newOrder.maintenance_type,
        technician_name: technicianName,
        component: newOrder.component,
        description: newOrder.description,
        machine_name: machine.name,
        operator_id: user.id,
        operator_name: user.name,
        assigned_user_id: selectedResponsible?.id ?? null,
        assigned_user_name: selectedResponsible?.name ?? null,
        start_time: queueStartedAt,
        end_time: null,
        status: 'open' as const,
        used_parts_tools: newOrder.used_parts_tools,
        tools: newOrder.tools
      };

      const result = await createServiceOrder(orderData);

      if (result) {
        await recordAuditAction({
          action: 'service_order_created',
          entityId: result.id,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
          details: {
            machine_name: machine.name,
            component: newOrder.component,
            maintenance_type: newOrder.maintenance_type,
            queue_started_at: queueStartedAt,
            assigned_user_id: selectedResponsible?.id ?? null,
            assigned_user_name: selectedResponsible?.name ?? null,
            event: 'service_order_queued',
          },
        });

        toast.success('✅ Ordem de serviço criada com sucesso!');
        await fetchOrders();
        setIsModalOpen(false);
        setNewOrder({
          machine_id: '',
          maintenance_type: 'corretiva',
          technician_name: '',
          responsible_user_id: 'na',
          component: '',
          description: '',
          used_parts_tools: [],
          tools: [],
          toolsInput: ''
        });
      } else {
        toast.error('❌ Erro ao criar ordem de serviço.');
      }
    } catch (err) {
      console.error('❌ Erro ao criar ordem:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`❌ Erro: ${errorMsg}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleFinishOrder = async (id: number) => {

    if (!user) return;

    try {
      const success = await closeServiceOrder(id, new Date().toISOString());
      if (success) {
        await recordAuditAction({
          action: 'service_order_closed',
          entityId: id,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
          details: {
            closed_via: 'quick-action'
          },
        });

        await fetchOrders();
        toast.success('Ordem de serviço finalizada com sucesso!');
      } else {
        toast.error('Erro ao finalizar ordem de serviço.');
      }
    } catch (err) {
      console.error('Erro ao finalizar ordem:', err);
      toast.error('Erro ao finalizar ordem de serviço.');
    }
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

  const submitFinishOrder = async (allowWithoutResolution: boolean) => {
    if (!finishingOrderId) return;
    if (!user) return;

    const resolutionText = finishReason.trim();
    if (!resolutionText && !allowWithoutResolution) {
      setShowFinishWithoutResolutionConfirm(true);
      return;
    }

    try {
      const breakState = orderBreaks[finishingOrderId];
      const activeBreakMs = breakState?.activeStartMs
        ? Math.max(0, Math.min(Date.now(), breakState.activeEndMs || Date.now()) - breakState.activeStartMs)
        : 0;
      const breakTotalMs = Math.max(0, Number(breakState?.totalMs || 0) + activeBreakMs);
      const breakLimitMinutes = Math.max(0, Number(breakMinutesAllowed || 0));
      const breakExceededLimit = breakTotalMs > breakLimitMinutes * 60 * 1000;

      const result = await closeServiceOrder(
        finishingOrderId,
        new Date().toISOString(),
        finalReport || undefined
      );
      if (result) {
        await recordAuditAction({
          action: 'service_order_closed',
          entityId: finishingOrderId,
          user: {
            id: user.id,
            name: user.name,
            role: user.role,
          },
          details: {
            status_from: 'open',
            status_to: 'closed',
            reason: resolutionText || null,
            closed_without_resolution_note: !resolutionText,
            has_final_report: Boolean(finalReport?.trim()),
            break_total_ms: breakTotalMs,
            break_limit_minutes: breakLimitMinutes,
            break_exceeded_limit: breakExceededLimit,
          },
        });

        toast.success('✅ Ordem de serviço finalizada com sucesso!');
        await fetchOrders();
        setShowFinishWithoutResolutionConfirm(false);
        setFinishModalOpen(false);
        setFinalReport('');
        setFinishReason('');
        setFinishingOrderId(null);
      } else {
        toast.error('Erro ao finalizar ordem de serviço.');
      }
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao finalizar ordem de serviço.');
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

  const parseTimestampMs = (value: string) => {
    const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
    const parsed = new Date(hasTimezone ? value : `${value}Z`).getTime();
    return Number.isFinite(parsed) ? parsed : Date.now();
  };

  const startOrderBreak = async (order: ServiceOrder) => {
    if (!user) return;

    const currentBreak = orderBreaks[order.id];
    if (currentBreak?.activeStartMs && currentBreak?.activeEndMs && Date.now() < currentBreak.activeEndMs) {
      toast.info('Esta O.S já está em intervalo.');
      return;
    }

    const startMs = Date.now();
    const endMs = startMs + breakMinutesAllowed * 60 * 1000;

    setOrderBreaks((prev) => ({
      ...prev,
      [order.id]: {
        totalMs: prev[order.id]?.totalMs || 0,
        activeStartMs: startMs,
        activeEndMs: endMs,
        pausedRemainingMs: null,
      },
    }));

    await recordAuditAction({
      action: 'service_order_updated',
      entityId: order.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      details: {
        event: 'service_order_break_started',
        break_minutes: breakMinutesAllowed,
        status: order.status,
      },
    });

    toast.success(`Intervalo de ${breakMinutesAllowed} minuto(s) iniciado.`);
  };

  const pauseOrderBreak = async (order: ServiceOrder) => {
    if (!user) return;

    const currentBreak = orderBreaks[order.id];
    if (!currentBreak?.activeStartMs || !currentBreak?.activeEndMs) {
      toast.info('Não há intervalo ativo para pausar.');
      return;
    }

    const now = Date.now();
    const remainingMs = Math.max(0, currentBreak.activeEndMs - now);

    setOrderBreaks((prev) => ({
      ...prev,
      [order.id]: {
        totalMs: prev[order.id]?.totalMs || 0,
        activeStartMs: null,
        activeEndMs: null,
        pausedRemainingMs: remainingMs,
      },
    }));

    await recordAuditAction({
      action: 'service_order_updated',
      entityId: order.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      details: {
        event: 'service_order_break_paused',
        remaining_seconds: Math.round(remainingMs / 1000),
      },
    });

    toast.info('Intervalo pausado.');
  };

  const resumeOrderBreak = async (order: ServiceOrder) => {
    if (!user) return;

    const currentBreak = orderBreaks[order.id];
    const remainingMs = Math.max(0, Number(currentBreak?.pausedRemainingMs || 0));

    if (!remainingMs) {
      toast.info('Não há intervalo pausado para retomar.');
      return;
    }

    const now = Date.now();
    setOrderBreaks((prev) => ({
      ...prev,
      [order.id]: {
        totalMs: prev[order.id]?.totalMs || 0,
        activeStartMs: now,
        activeEndMs: now + remainingMs,
        pausedRemainingMs: null,
      },
    }));

    await recordAuditAction({
      action: 'service_order_updated',
      entityId: order.id,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      details: {
        event: 'service_order_break_resumed',
        remaining_seconds: Math.round(remainingMs / 1000),
      },
    });

    toast.success('Intervalo retomado.');
  };

  const getBreakRemainingLabel = (orderId: number) => {
    const state = orderBreaks[orderId];
    if (!state) return null;

    if (state.pausedRemainingMs) {
      const pausedMinutes = Math.floor(state.pausedRemainingMs / (1000 * 60));
      const pausedSeconds = Math.floor((state.pausedRemainingMs % (1000 * 60)) / 1000);
      return `${String(pausedMinutes).padStart(2, '0')}:${String(pausedSeconds).padStart(2, '0')}`;
    }

    if (!state.activeEndMs || !state.activeStartMs) return null;

    const remainingMs = Math.max(0, state.activeEndMs - Date.now());
    const minutes = Math.floor(remainingMs / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isBreakActive = (orderId: number) => {
    const state = orderBreaks[orderId];
    return Boolean(state?.activeStartMs && state?.activeEndMs && Date.now() < state.activeEndMs);
  };

  const isBreakPaused = (orderId: number) => {
    const state = orderBreaks[orderId];
    return Boolean(state?.pausedRemainingMs && state.pausedRemainingMs > 0);
  };

  const hasWorkStarted = (orderId: number) => {
    const routing = orderRoutingById[orderId];
    return Boolean(routing?.workStartedAt);
  };

  const getEffectiveAssignedUserId = (order: ServiceOrder): number | null => {
    const assignedFromOrder = Number(order.assigned_user_id);
    if (Number.isFinite(assignedFromOrder) && assignedFromOrder > 0) {
      return assignedFromOrder;
    }

    const assignedFromRouting = Number(orderRoutingById[order.id]?.assignedUserId);
    return Number.isFinite(assignedFromRouting) && assignedFromRouting > 0 ? assignedFromRouting : null;
  };

  const getEffectiveAssignedUserName = (order: ServiceOrder): string | null => {
    const fromOrder = String(order.assigned_user_name || '').trim();
    if (fromOrder) return fromOrder;

    const fromRouting = String(orderRoutingById[order.id]?.assignedUserName || '').trim();
    return fromRouting || null;
  };

  const canViewOrder = (order: ServiceOrder) => {
    if (!user) return false;
    if (isAdmin) return true;

    const assignedUserId = getEffectiveAssignedUserId(order);
    if (assignedUserId) {
      return assignedUserId === user.id;
    }

    return true;
  };

  const startWorkOnOrder = async (order: ServiceOrder) => {
    if (!user) return;
    if (order.status !== 'open') return;

    const routing = orderRoutingById[order.id];
    const alreadyStarted = Boolean(routing?.workStartedAt);
    if (alreadyStarted) return;

    if (!canViewOrder(order)) {
      toast.error('Esta O.S está atribuída para outro responsável.');
      return;
    }

    const nowIso = new Date().toISOString();
    const queueStartIso = routing?.queueStartedAt || order.created_at || order.start_time || nowIso;
    const queueWaitMs = Math.max(0, new Date(nowIso).getTime() - new Date(queueStartIso).getTime());

    try {
      const updated = await updateServiceOrder(order.id, {
        start_time: nowIso,
        technician_name: user.name,
        assigned_user_id: user.id,
        assigned_user_name: user.name,
      });

      if (!updated) {
        toast.error('Não foi possível iniciar o trabalho nesta O.S.');
        return;
      }

      await recordAuditAction({
        action: 'service_order_updated',
        entityId: order.id,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        details: {
          event: 'service_order_work_started',
          queue_started_at: queueStartIso,
          work_started_at: nowIso,
          queue_wait_ms: queueWaitMs,
          started_by_user_id: user.id,
          started_by_user_name: user.name,
          assigned_user_id: user.id,
          assigned_user_name: user.name,
        },
      });

      await fetchOrders();
      toast.success('Trabalho iniciado com sucesso.');
    } catch (err) {
      console.error('Erro ao iniciar trabalho na O.S:', err);
      toast.error('Erro ao iniciar o trabalho.');
    }
  };

  const validateOrderForm = () => {
    if (!newOrder.machine_id || String(newOrder.machine_id).trim() === '') {
      return 'Campo obrigatório: Máquina';
    }
    if (!newOrder.responsible_user_id || String(newOrder.responsible_user_id).trim() === '') {
      return 'Selecione o responsável (ou N/A)';
    }
    if (!newOrder.component || newOrder.component.trim().length < 2) {
      return 'Informe o componente com pelo menos 2 caracteres';
    }
    if (!newOrder.description || newOrder.description.trim().length < 8) {
      return 'A descrição precisa ter no mínimo 8 caracteres';
    }
    return null;
  };

  const calculateDuration = (orderId: number, start: string, end: string | null) => {
    try {
      const startTime = parseTimestampMs(start);
      let diff = 0;
      const breakState = orderBreaks[orderId];
      const pausedByBreakMs = Math.max(0, Number(breakState?.totalMs || 0)) + (
        breakState?.activeStartMs
          ? Math.max(0, Math.min(clockMs, breakState.activeEndMs || clockMs) - breakState.activeStartMs)
          : 0
      );

      if (end) {
        const endTime = parseTimestampMs(end);
        diff = Math.max(0, endTime - startTime);
      } else {
        const now = clockMs;
        const cache = liveTimerBaseRef.current;

        if (!cache[orderId]) {
          cache[orderId] = {
            baseDiffMs: Math.max(0, now - startTime),
            baseAtMs: now,
          };
        }

        const baseline = cache[orderId];
        diff = Math.max(0, baseline.baseDiffMs + Math.max(0, now - baseline.baseAtMs) - pausedByBreakMs);
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (err) {
      return '00:00:00';
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!canViewOrder(order)) {
      return false;
    }

    // Admin keeps this page focused on active operations; closed items are in History.
    if (isAdmin && order.status !== 'open') {
      return false;
    }

    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    if (!searchTerm.trim()) {
      return true;
    }

    const q = searchTerm.toLowerCase();
    const assignedName = (getEffectiveAssignedUserName(order) || '').toLowerCase();
    return (
      order.machine_name.toLowerCase().includes(q) ||
      order.component.toLowerCase().includes(q) ||
      order.technician_name.toLowerCase().includes(q) ||
      assignedName.includes(q) ||
      String(order.id).includes(q)
    );
  });

  const saveCurrentFilter = () => {
    if (!user) return;

    const name = savedFilterName.trim();
    if (!name) {
      toast.error('Dê um nome para o filtro favorito.');
      return;
    }

    const next: SavedServiceOrdersFilter[] = [
      {
        id: `f_${Date.now()}`,
        name,
        query: searchTerm,
        status: statusFilter,
      },
      ...savedFilters,
    ].slice(0, 10);

    setSavedFilters(next);
    setSavedFilterName('');
    localStorage.setItem(`service-orders-filters:${user.id}`, JSON.stringify(next));
    toast.success('Filtro salvo com sucesso.');
  };

  const applySavedFilter = (filter: SavedServiceOrdersFilter) => {
    setSearchTerm(filter.query);
    setStatusFilter(filter.status);
  };

  const exportOrdersCsv = () => {
    if (!canExportOrders) {
      toast.error('Sem permissão para exportar.');
      return;
    }

    const header = [
      'id',
      'máquina',
      'status',
      'tipo_manutencao',
      'responsavel',
      'componente',
      'inicio',
      'fim'
    ];

    const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = filteredOrders.map((order) => [
      order.id,
      order.machine_name,
      order.status,
      order.maintenance_type,
      order.technician_name,
      order.component,
      order.start_time,
      order.end_time || '',
    ]);

    const csv = [header, ...rows].map((line) => line.map(escapeCell).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ordens-servico-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manutenção Corretiva</h2>
          <p className="text-slate-500">Gerenciamento de ordens de serviço</p>
        </div>
        <div className="flex flex-wrap items-stretch gap-2 sm:gap-3 w-full sm:w-auto">
          {canDeleteOrder && (
            <button
              onClick={openDeleteModal}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 sm:px-5 rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              Excluir O.S
            </button>
          )}
          {canOpenPartsToolsManager && (
            <button
              onClick={() => setIsPartsToolsModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 px-4 sm:px-5 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <Package size={20} /> Cadastrar Peça/Ferramenta
            </button>
          )}
          {canExportOrders && (
            <button
              onClick={exportOrdersCsv}
              className="bg-slate-700 hover:bg-slate-800 text-white font-medium py-2.5 px-4 sm:px-5 rounded-xl shadow-lg shadow-slate-700/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              Exportar CSV
            </button>
          )}
          {canCreateOrder && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 sm:px-5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
            >
              <Plus size={20} /> Nova O.S.
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Busca global de O.S</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por máquina, componente, responsável ou ID"
              className="w-full pl-9 p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'closed')}
            className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
          >
            {isAdmin ? (
              <option value="open">Abertas e pausadas</option>
            ) : (
              <>
                <option value="all">Todos</option>
                <option value="open">Em andamento</option>
                <option value="closed">Finalizadas</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Filtros salvos</label>
          <select
            defaultValue=""
            onChange={(e) => {
              const found = savedFilters.find((filter) => filter.id === e.target.value);
              if (found) {
                applySavedFilter(found);
              }
            }}
            className="w-full p-2.5 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none bg-white"
          >
            <option value="">Selecionar...</option>
            {savedFilters.map((filter) => (
              <option key={filter.id} value={filter.id}>{filter.name}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={savedFilterName}
              onChange={(e) => setSavedFilterName(e.target.value)}
              placeholder="Nome do filtro favorito"
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

        <div className="flex items-end">
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter(isAdmin ? 'open' : 'all');
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${order.status === 'open' ? (hasWorkStarted(order.id) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700') : 'bg-slate-100 text-slate-600'}`}>
                  {order.status === 'open' ? (hasWorkStarted(order.id) ? 'Em Andamento' : 'Em Fila') : 'Finalizada'}
                </span>
                {order.status === 'open' && isBreakPaused(order.id) && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                    Intervalo pausado
                  </span>
                )}
                <span className="text-sm text-slate-400 font-mono">#{order.id.toString().padStart(4, '0')}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{order.machine_name}</h3>
              <p className="text-slate-600 mt-1"><span className="font-medium">Componente:</span> {order.component}</p>
              <p className="text-slate-600 mt-1"><span className="font-medium">Responsável:</span> {getEffectiveAssignedUserName(order) || 'N/A (disponível para todos)'}</p>
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

            <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto md:min-w-[200px]">
              <div className="text-right">
                <div className="flex items-center gap-2 text-slate-500 text-sm justify-end">
                  <Clock size={16} />
                  {order.status === 'open' && !hasWorkStarted(order.id) ? 'Fila' : 'Duração'}
                </div>
                <div className="text-2xl font-mono font-bold text-slate-800">
                  {order.status === 'open' && !hasWorkStarted(order.id)
                    ? 'Aguardando'
                    : calculateDuration(order.id, order.start_time, order.end_time)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {order.status === 'open' ? (
                  hasWorkStarted(order.id) ? (
                    canFinalizeOrder(order) && (
                      <>
                        <button
                          onClick={() => {
                            setFinishingOrderId(order.id);
                            setFinalReport('');
                            setFinishReason('');
                            setFinishModalOpen(true);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          <Square size={16} fill="currentColor" /> Finalizar
                        </button>
                        <button
                          onClick={() => void startOrderBreak(order)}
                          disabled={isBreakActive(order.id) || isBreakPaused(order.id)}
                          className="bg-amber-100 hover:bg-amber-200 disabled:opacity-60 disabled:cursor-not-allowed text-amber-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          {isBreakActive(order.id) || isBreakPaused(order.id)
                            ? `Em intervalo (${getBreakRemainingLabel(order.id)})`
                            : `Iniciar intervalo (${breakMinutesAllowed} min)`}
                        </button>
                        {isBreakActive(order.id) && (
                          <button
                            onClick={() => void pauseOrderBreak(order)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Pausar intervalo
                          </button>
                        )}
                        {isBreakPaused(order.id) && (
                          <button
                            onClick={() => void resumeOrderBreak(order)}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Retomar intervalo ({getBreakRemainingLabel(order.id)})
                          </button>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      <button
                        onClick={() => void startWorkOnOrder(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Iniciar trabalho
                      </button>
                      <p className="text-xs text-slate-500 max-w-[220px]">
                        Ao iniciar, esta O.S sai da fila e fica atribuída a você.
                      </p>
                    </>
                  )
                ) : (
                  <div className="flex gap-2">
                    {canEditOrder(order) && (
                      <button
                        onClick={() => {
                          setEditingOrder(order);
                          setEditReport(order.final_report || '');
                          setEditTools(order.tools || []);
                          setEditComponent(order.component || '');
                          setEditReason('');
                          setEditReportModalOpen(true);
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Editar Relatório
                      </button>
                    )}
                    {canReopenOrder() && (
                      <button
                        onClick={() => {
                          setReopeningOrder(order);
                          setReopenReason('');
                          setReopenModalOpen(true);
                        }}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Reabrir O.S
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {filteredOrders.length === 0 && (
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
                      name="deleteMode"
                      checked={deleteMode === 'all'}
                      onChange={() => setDeleteMode('all')}
                    />
                    <span className="font-medium text-slate-700">Apagar todas as O.S</span>
                  </label>
                  <label className="border rounded-xl p-3 flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === 'specific'}
                      onChange={() => setDeleteMode('specific')}
                    />
                    <span className="font-medium text-slate-700">Escolher O.S específicas</span>
                  </label>
                </div>

                {deleteMode === 'specific' && (
                  <div className="border border-slate-200 rounded-xl p-3 max-h-52 overflow-y-auto">
                    {orders.length === 0 ? (
                      <p className="text-sm text-slate-500">Não há O.S para selecionar.</p>
                    ) : (
                      <div className="space-y-2">
                        {orders.map(order => (
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

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto ui-scrollbar"
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
                  <select
                    required
                    value={newOrder.responsible_user_id}
                    onChange={(e) => setNewOrder({ ...newOrder, responsible_user_id: e.target.value })}
                    className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
                  >
                    <option value="na">N/A (disponivel para todos)</option>
                    {assignableUsers.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Se selecionar um responsavel, a O.S aparece somente para ele. Com N/A, qualquer operador pode receber.
                  </p>
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
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 ui-scrollbar">
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

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    aria-busy={isSubmittingOrder}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={18} /> {isSubmittingOrder ? 'Cadastrando...' : 'Cadastrar O.S'}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
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
              <label className="block text-sm font-medium text-slate-700 mt-4 mb-1">Status/motivo da resolução (opcional)</label>
              <input
                value={finishReason}
                onChange={(e) => setFinishReason(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                placeholder="Ex: Problema resolvido, aguardando teste final"
              />
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => {
                    setFinishModalOpen(false);
                    setShowFinishWithoutResolutionConfirm(false);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    void submitFinishOrder(false);
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

      <AnimatePresence>
        {showFinishWithoutResolutionConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5"
            >
              <h3 className="text-lg font-bold text-slate-900">Finalizar sem status de resolucao?</h3>
              <p className="text-sm text-slate-600 mt-2">
                Esta O.S sera finalizada sem informar se o problema foi resolvido. Deseja continuar mesmo assim?
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button
                  onClick={() => setShowFinishWithoutResolutionConfirm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    void submitFinishOrder(true);
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg"
                >
                  Finalizar mesmo assim
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Motivo da alteração *</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 mb-3"
                placeholder="Ex: Correção de dados técnicos do relatório"
              />
              <label className="block text-sm font-medium text-slate-700 mb-1">Relatório Final (opcional)</label>
              <textarea value={editReport} onChange={e => setEditReport(e.target.value)} rows={5} className="w-full p-3 rounded-lg border border-slate-200 mb-4" />
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setEditReportModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 py-3 rounded-lg">Cancelar</button>
                <button onClick={async () => {
                  if (!editingOrder) return;
                  if (!user) return;
                  
                  // Validar campo obrigatório
                  if (!editComponent.trim()) {
                    toast.error('Componente é obrigatório');
                    return;
                  }

                  if (!editReason.trim()) {
                    toast.error('Motivo da alteração é obrigatório');
                    return;
                  }
                  
                  try {
                    const result = await updateServiceOrder(editingOrder.id, {
                      final_report: editReport,
                      tools: editTools,
                      component: editComponent
                    });
                    
                    if (result) {
                      await recordAuditAction({
                        action: 'service_order_updated',
                        entityId: editingOrder.id,
                        user: {
                          id: user.id,
                          name: user.name,
                          role: user.role,
                        },
                        details: {
                          fields: ['final_report', 'tools', 'component'],
                          previous_component: editingOrder.component,
                          next_component: editComponent,
                          previous_tools_count: (editingOrder.tools || []).length,
                          next_tools_count: editTools.length,
                          reason: editReason.trim(),
                        },
                      });

                      toast.success('Relatório atualizado com sucesso!');
                      await fetchOrders();
                      setEditReportModalOpen(false);
                      setEditingOrder(null);
                      setEditReason('');
                    } else {
                      toast.error('❌ Erro ao atualizar relatório.');
                    }
                  } catch (err) { 
                    console.error(err);
                    toast.error('❌ Erro ao atualizar relatório.');
                  }
                }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg">Salvar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reopenModalOpen && reopeningOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-4 sm:p-6"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Reabrir Ordem de Serviço</h3>
              <p className="text-slate-500 mb-4">Informe o motivo para reabrir a O.S #{reopeningOrder.id.toString().padStart(4, '0')}.</p>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                rows={4}
                placeholder="Ex: Falha reapareceu durante teste final"
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={() => {
                    setReopenModalOpen(false);
                    setReopenReason('');
                    setReopeningOrder(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={isReopeningOrder}
                  onClick={async () => {
                    if (!reopeningOrder || !user) return;
                    if (!reopenReason.trim()) {
                      toast.error('Informe o motivo da reabertura.');
                      return;
                    }

                    try {
                      setIsReopeningOrder(true);

                      const reopenAt = new Date();
                      const previousStartMs = parseTimestampMs(reopeningOrder.start_time);
                      const previousEndMs = reopeningOrder.end_time
                        ? parseTimestampMs(reopeningOrder.end_time)
                        : reopenAt.getTime();
                      const elapsedBeforeReopenMs = Math.max(0, previousEndMs - previousStartMs);
                      const adjustedStartIso = new Date(reopenAt.getTime() - elapsedBeforeReopenMs).toISOString();

                      const result = await updateServiceOrder(reopeningOrder.id, {
                        status: 'open',
                        end_time: null,
                        start_time: adjustedStartIso,
                      });

                      if (!result) {
                        toast.error('Não foi possível reabrir a O.S.');
                        return;
                      }

                      await recordAuditAction({
                        action: 'service_order_updated',
                        entityId: reopeningOrder.id,
                        user: {
                          id: user.id,
                          name: user.name,
                          role: user.role,
                        },
                        details: {
                          status_from: 'closed',
                          status_to: 'open',
                          reason: reopenReason.trim(),
                          elapsed_before_reopen_seconds: Math.round(elapsedBeforeReopenMs / 1000),
                          event: 'service_order_reopened',
                        },
                      });

                      toast.success('O.S reaberta com sucesso.');
                      await fetchOrders();
                      setReopenModalOpen(false);
                      setReopenReason('');
                      setReopeningOrder(null);
                    } catch (err) {
                      console.error('Erro ao reabrir O.S:', err);
                      toast.error('Erro ao reabrir O.S.');
                    } finally {
                      setIsReopeningOrder(false);
                    }
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  {isReopeningOrder ? 'Reabrindo...' : 'Reabrir O.S'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
