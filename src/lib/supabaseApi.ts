import { supabase, ServiceOrder, Machine, PartTool, User } from './supabase';
import {
  getUnsyncedChecklists,
  processChecklistSyncQueue,
  queueChecklistForSync,
} from './offlineChecklist';
import {
  getCachedRows,
  isBrowserOnline,
  processOfflineSyncQueue,
  queueCloseServiceOrder,
  queueDelete,
  queueDeleteManyServiceOrders,
  queueDeleteServiceOrdersByScope,
  queueInsert,
  queueUpdate,
  queueUpsertChecklistTemplate,
  setCachedRows,
  upsertCachedRow,
  removeCachedRow,
} from './offlineSync';

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeUser(user: any): User {
  return {
    ...user,
    allowed_modules: safeParseJson<number[]>(user.allowed_modules, []),
  };
}

function normalizeMachine(machine: any): Machine {
  return {
    ...machine,
    quick_specs: safeParseJson<string[]>(machine.quick_specs, []),
  };
}

function normalizeServiceOrder(order: any): ServiceOrder {
  return {
    ...order,
    tools: safeParseJson<string[]>(order.tools, []),
    used_parts_tools: safeParseJson<number[]>(order.used_parts_tools, []),
  };
}

const STORAGE_BUCKET = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) || 'machines';
const STORAGE_BUCKET_CANDIDATES = Array.from(new Set([STORAGE_BUCKET, 'machines', 'manuals']));

async function uploadWithBucketFallback(
  fileName: string,
  file: File,
  options?: { contentType?: string }
): Promise<{ publicUrl: string; bucket: string } | null> {
  let lastError: any = null;

  for (const bucket of STORAGE_BUCKET_CANDIDATES) {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        upsert: true,
        ...(options?.contentType ? { contentType: options.contentType } : {}),
      });

    if (error) {
      lastError = error;
      const message = String(error.message || '').toLowerCase();
      if (message.includes('bucket not found')) {
        continue;
      }
      throw error;
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return {
      publicUrl: publicUrl?.publicUrl || '',
      bucket,
    };
  }

  if (lastError) {
    console.error('Falha ao enviar arquivo para todos os buckets candidatos:', STORAGE_BUCKET_CANDIDATES, lastError);
  }

  return null;
}

// ===== USERS =====
export async function loginUser(username: string, password: string): Promise<User | null> {
  try {
    if (!isBrowserOnline()) {
      const cachedUsers = getCachedRows<any>('users').map(normalizeUser);
      const offlineMatch = cachedUsers.find((u: any) => u.username === username && (u as any).password === password);
      return offlineMatch || null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .maybeSingle();

    if (error) {
      // Credentials mismatch should not spam console as transport error.
      if (error.code !== 'PGRST116') {
        console.error('Erro ao fazer login:', error);
      }
      return null;
    }

    if (!data) return null;

    const normalized = normalizeUser(data);
    upsertCachedRow('users', data as any);
    return normalized;
  } catch (err) {
    console.error('Erro ao fazer login:', err);

    const cachedUsers = getCachedRows<any>('users').map(normalizeUser);
    const offlineMatch = cachedUsers.find((u: any) => u.username === username && (u as any).password === password);
    if (offlineMatch) return offlineMatch;

    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  if (!isBrowserOnline()) {
    return getCachedRows<any>('users').map(normalizeUser);
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    setCachedRows('users', data || []);
    return (data || []).map(normalizeUser);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    return getCachedRows<any>('users').map(normalizeUser);
  }
}

export async function createUser(user: Omit<User & { password: string }, 'id'>): Promise<User | null> {
  try {
    const userData = {
      ...user,
      allowed_modules: JSON.stringify(user.allowed_modules || [])
    };

    if (!isBrowserOnline()) {
      const tempId = queueInsert('users', 'users', userData as any);
      const localRow = { id: tempId, ...userData } as any;
      upsertCachedRow('users', localRow);
      return normalizeUser(localRow);
    }

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;

    if (!data) return null;

    upsertCachedRow('users', data as any);
    void processOfflineSyncQueue();
    return normalizeUser(data);
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return null;
  }
}

export async function updateUser(id: number, updates: Partial<User & { password?: string }>): Promise<User | null> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.password !== undefined) updateData.password = updates.password;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.allowed_modules !== undefined) updateData.allowed_modules = JSON.stringify(updates.allowed_modules || []);

    if (!isBrowserOnline()) {
      queueUpdate('users', 'users', id, updateData);
      const cached = getCachedRows<any>('users');
      const existing = cached.find((u) => u.id === id);
      if (existing) {
        const merged = { ...existing, ...updateData };
        upsertCachedRow('users', merged);
        return normalizeUser(merged);
      }
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) return null;

    upsertCachedRow('users', data as any);
    void processOfflineSyncQueue();
    return normalizeUser(data);
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return null;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    if (!isBrowserOnline()) {
      queueDelete('users', 'users', id);
      removeCachedRow<any>('users', id);
      return true;
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    removeCachedRow<any>('users', id);
    void processOfflineSyncQueue();
    return true;
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    return false;
  }
}

// ===== MACHINES =====
export async function getMachines(): Promise<Machine[]> {
  if (!isBrowserOnline()) {
    return getCachedRows<any>('machines').map(normalizeMachine);
  }

  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*');

    if (error) throw error;
    setCachedRows('machines', data || []);
    return (data || []).map(normalizeMachine);
  } catch (err) {
    console.error('Erro ao buscar máquinas:', err);
    return getCachedRows<any>('machines').map(normalizeMachine);
  }
}

export async function createMachine(machine: Omit<Machine, 'id'>): Promise<Machine | null> {
  try {
    if (!isBrowserOnline()) {
      const tempId = queueInsert('machines', 'machines', machine as any);
      const localRow = { id: tempId, ...machine };
      upsertCachedRow('machines', localRow as any);
      return normalizeMachine(localRow);
    }

    const { data, error } = await supabase
      .from('machines')
      .insert([machine])
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    upsertCachedRow('machines', data as any);
    void processOfflineSyncQueue();
    return normalizeMachine(data);
  } catch (err) {
    console.error('Erro ao criar máquina:', err);
    return null;
  }
}

// ===== PARTS/TOOLS =====
export async function getPartsTools(): Promise<PartTool[]> {
  if (!isBrowserOnline()) {
    return getCachedRows<PartTool>('parts_tools');
  }

  try {
    const { data, error } = await supabase
      .from('parts_tools')
      .select('*');

    if (error) throw error;
    setCachedRows('parts_tools', data || []);
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar peças/ferramentas:', err);
    return getCachedRows<PartTool>('parts_tools');
  }
}

export async function createPartTool(item: Omit<PartTool, 'id'>): Promise<PartTool | null> {
  try {
    if (!isBrowserOnline()) {
      const tempId = queueInsert('parts_tools', 'parts_tools', item as any);
      const localRow = { id: tempId, ...item } as PartTool;
      upsertCachedRow('parts_tools', localRow as any);
      return localRow;
    }

    const { data, error } = await supabase
      .from('parts_tools')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    if (data) upsertCachedRow('parts_tools', data as any);
    void processOfflineSyncQueue();
    return data;
  } catch (err) {
    console.error('Erro ao criar peça/ferramenta:', err);
    return null;
  }
}

export async function deletePartTool(id: number): Promise<boolean> {
  try {
    if (!isBrowserOnline()) {
      queueDelete('parts_tools', 'parts_tools', id);
      removeCachedRow<any>('parts_tools', id);
      return true;
    }

    const { error } = await supabase
      .from('parts_tools')
      .delete()
      .eq('id', id);

    if (error) throw error;
    removeCachedRow<any>('parts_tools', id);
    void processOfflineSyncQueue();
    return true;
  } catch (err) {
    console.error('Erro ao deletar peça/ferramenta:', err);
    return false;
  }
}

// ===== SERVICE ORDERS =====
export async function getServiceOrders(): Promise<ServiceOrder[]> {
  if (!isBrowserOnline()) {
    return getCachedRows<any>('service_orders').map(normalizeServiceOrder);
  }

  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    setCachedRows('service_orders', data || []);
    return (data || []).map(normalizeServiceOrder);
  } catch (err) {
    console.error('Erro ao buscar ordens de serviço:', err);
    return getCachedRows<any>('service_orders').map(normalizeServiceOrder);
  }
}

export async function createServiceOrder(order: Omit<ServiceOrder, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceOrder | null> {
  try {
    const orderToInsert = {
      ...order,
      tools: JSON.stringify(order.tools || []),
      used_parts_tools: JSON.stringify(order.used_parts_tools || [])
    };

    if (!isBrowserOnline()) {
      const tempId = queueInsert('service_orders', 'service_orders', orderToInsert as any);
      const nowIso = new Date().toISOString();
      const localRow = {
        ...orderToInsert,
        id: tempId,
        created_at: nowIso,
        updated_at: nowIso,
      } as any;
      upsertCachedRow('service_orders', localRow);
      return normalizeServiceOrder(localRow);
    }

    const { data, error } = await supabase
      .from('service_orders')
      .insert([orderToInsert])
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
      upsertCachedRow('service_orders', data as any);
      void processOfflineSyncQueue();
      return {
        ...data,
        tools: safeParseJson<string[]>(data.tools, []),
        used_parts_tools: safeParseJson<number[]>(data.used_parts_tools, [])
      };
    }
    return null;
  } catch (err) {
    console.error('Erro ao criar ordem de serviço:', err);
    return null;
  }
}

export async function updateServiceOrder(id: number, updates: Partial<ServiceOrder>): Promise<ServiceOrder | null> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (updates.final_report !== undefined) updateData.final_report = updates.final_report;
    if (updates.tools !== undefined) updateData.tools = JSON.stringify(updates.tools || []);
    if (updates.used_parts_tools !== undefined) updateData.used_parts_tools = JSON.stringify(updates.used_parts_tools || []);
    if (updates.component !== undefined) updateData.component = updates.component;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.end_time !== undefined) updateData.end_time = updates.end_time;

    if (!isBrowserOnline()) {
      queueUpdate('service_orders', 'service_orders', id, updateData);
      const cached = getCachedRows<any>('service_orders');
      const existing = cached.find((o) => o.id === id);
      if (existing) {
        const merged = { ...existing, ...updateData };
        upsertCachedRow('service_orders', merged);
        return normalizeServiceOrder(merged);
      }
      return null;
    }

    const { data, error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
      upsertCachedRow('service_orders', data as any);
      void processOfflineSyncQueue();
      return {
        ...data,
        tools: safeParseJson<string[]>(data.tools, []),
        used_parts_tools: safeParseJson<number[]>(data.used_parts_tools, [])
      };
    }
    return null;
  } catch (err) {
    console.error('Erro ao atualizar ordem de serviço:', err);
    return null;
  }
}

export async function closeServiceOrder(id: number, endTime: string, finalReport?: string): Promise<boolean> {
  try {
    if (!isBrowserOnline()) {
      queueCloseServiceOrder(id, endTime, finalReport);
      const cached = getCachedRows<any>('service_orders');
      const existing = cached.find((o) => o.id === id);
      if (existing) {
        upsertCachedRow('service_orders', {
          ...existing,
          status: 'closed',
          end_time: endTime,
          ...(finalReport !== undefined ? { final_report: finalReport } : {}),
        } as any);
      }
      return true;
    }

    const updates: Record<string, unknown> = {
      status: 'closed',
      end_time: endTime
    };

    if (finalReport !== undefined) {
      updates.final_report = finalReport;
    }

    const { error } = await supabase
      .from('service_orders')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    void processOfflineSyncQueue();
    return true;
  } catch (err) {
    console.error('Erro ao fechar ordem de serviço:', err);
    return false;
  }
}

export async function deleteAllServiceOrders(): Promise<boolean> {
  return deleteServiceOrdersByScope('all');
}

export type ServiceOrderDeleteScope = 'all' | 'open' | 'closed';

export async function verifyUserCredentials(
  username: string,
  password: string,
  requiredRole?: 'admin' | 'operator'
): Promise<boolean> {
  try {
    if (!isBrowserOnline()) {
      const cachedUsers = getCachedRows<any>('users').map(normalizeUser);
      const match = cachedUsers.find((u: any) => {
        const roleOk = requiredRole ? u.role === requiredRole : true;
        return u.username === username && (u as any).password === password && roleOk;
      });
      return Boolean(match);
    }

    let query = supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('password', password);

    if (requiredRole) {
      query = query.eq('role', requiredRole);
    }

    const { data, error } = await query.limit(1);
    if (error) throw error;
    return !!data && data.length > 0;
  } catch (err) {
    console.error('Erro ao validar credenciais do usuário:', err);
    return false;
  }
}

export async function deleteServiceOrdersByScope(scope: ServiceOrderDeleteScope): Promise<boolean> {
  try {
    if (!isBrowserOnline()) {
      queueDeleteServiceOrdersByScope(scope);
      const current = getCachedRows<any>('service_orders');
      const filtered =
        scope === 'all'
          ? []
          : current.filter((o) => (scope === 'open' ? o.status !== 'open' : o.status !== 'closed'));
      setCachedRows('service_orders', filtered);
      return true;
    }

    let query = supabase.from('service_orders').delete();

    if (scope === 'open') {
      query = query.eq('status', 'open');
    } else if (scope === 'closed') {
      query = query.eq('status', 'closed');
    } else {
      // Supabase delete requires a filter; this safely targets persisted statuses.
      query = query.in('status', ['open', 'closed']);
    }

    const { error } = await query;

    if (error) throw error;
    void processOfflineSyncQueue();
    return true;
  } catch (err) {
    console.error('Erro ao deletar ordens de serviço por escopo:', err);
    return false;
  }
}

export async function deleteServiceOrdersByIds(ids: number[]): Promise<boolean> {
  try {
    if (!ids.length) return true;

    if (!isBrowserOnline()) {
      queueDeleteManyServiceOrders(ids);
      const current = getCachedRows<any>('service_orders');
      setCachedRows('service_orders', current.filter((row) => !ids.includes(row.id)));
      return true;
    }

    const { error } = await supabase
      .from('service_orders')
      .delete()
      .in('id', ids);

    if (error) throw error;
    void processOfflineSyncQueue();
    return true;
  } catch (err) {
    console.error('Erro ao deletar ordens de serviço por IDs:', err);
    return false;
  }
}

// ===== CHECKLISTS =====
export async function getChecklists(): Promise<any[]> {
  const localUnsynced = await getUnsyncedChecklists();

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return localUnsynced;
    }

    const { data, error } = await supabase
      .from('checklists')
      .select('*');

    if (error) throw error;

    return [...(data || []), ...localUnsynced];
  } catch (err) {
    console.error('Erro ao buscar checklists:', err);
    return localUnsynced;
  }
}

export async function createChecklist(checklist: any): Promise<any> {
  const payload = {
    machine_id: checklist.machine_id,
    operator_id: checklist.operator_id,
    date: checklist.date,
    status: checklist.status,
    data: checklist.data || {}
  };

  const enqueueAndReturn = async () => {
    const queued = await queueChecklistForSync(payload);
    return queued;
  };

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return await enqueueAndReturn();
    }

    const { data, error } = await supabase
      .from('checklists')
      .insert([{
        ...payload,
        data: JSON.stringify(payload.data || {})
      }])
      .select()
      .single();

    if (error) throw error;

    void processChecklistSyncQueue();
    return data;
  } catch (err) {
    console.error('Erro ao criar checklist:', err);

    try {
      return await enqueueAndReturn();
    } catch (queueErr) {
      console.error('Erro ao salvar checklist offline:', queueErr);
      return null;
    }
  }
}

// ===== CHECKLIST TEMPLATES =====
export async function getChecklistTemplates(): Promise<any[]> {
  if (!isBrowserOnline()) {
    return getCachedRows<any>('checklist_templates').map(template => ({
      ...template,
      items: safeParseJson(template.items, [])
    }));
  }

  try {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*');

    if (error) throw error;
    setCachedRows('checklist_templates', data || []);
    return (data || []).map(template => ({
      ...template,
      items: safeParseJson(template.items, [])
    }));
  } catch (err) {
    console.error('Erro ao buscar templates:', err);
    return getCachedRows<any>('checklist_templates').map(template => ({
      ...template,
      items: safeParseJson(template.items, [])
    }));
  }
}

export async function getChecklistTemplateByModel(model: string): Promise<any> {
  if (!isBrowserOnline()) {
    const templates = getCachedRows<any>('checklist_templates');
    const found = templates.find((template) => template.machine_model === model);
    return found
      ? {
          ...found,
          items: safeParseJson(found.items, []),
        }
      : null;
  }

  try {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('machine_model', model)
      .maybeSingle();

    if (error) {
      console.log('Template não encontrado para modelo:', model);
      return null;
    }

    if (!data) return null;

    const cached = getCachedRows<any>('checklist_templates');
    const next = cached.filter((template) => template.machine_model !== model);
    next.unshift(data as any);
    setCachedRows('checklist_templates', next);

    return {
      ...data,
      items: safeParseJson(data.items, [])
    };
  } catch (err) {
    console.error('Erro ao buscar template:', err);

    const templates = getCachedRows<any>('checklist_templates');
    const found = templates.find((template) => template.machine_model === model);
    if (found) {
      return {
        ...found,
        items: safeParseJson(found.items, [])
      };
    }

    return null;
  }
}

export async function updateChecklistTemplate(machineModel: string, items: any): Promise<any> {
  try {
    if (!isBrowserOnline()) {
      queueUpsertChecklistTemplate(machineModel, items);
      const cached = getCachedRows<any>('checklist_templates');
      const filtered = cached.filter((template) => template.machine_model !== machineModel);
      const localTemplate = {
        id: cached.find((template) => template.machine_model === machineModel)?.id || machineModel,
        machine_model: machineModel,
        items: JSON.stringify(items)
      };
      filtered.unshift(localTemplate);
      setCachedRows('checklist_templates', filtered);
      return {
        ...localTemplate,
        items,
      };
    }

    const { data: existing, error: checkError } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('machine_model', machineModel)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    const templateData = {
      machine_model: machineModel,
      items: JSON.stringify(items)
    };

    if (existing) {
      // Update existing template
      const { data, error } = await supabase
        .from('checklist_templates')
        .update(templateData)
        .eq('machine_model', machineModel)
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        const cached = getCachedRows<any>('checklist_templates');
        setCachedRows(
          'checklist_templates',
          [data, ...cached.filter((template) => template.machine_model !== machineModel)]
        );
      }
      void processOfflineSyncQueue();
      return data;
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert([templateData])
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        const cached = getCachedRows<any>('checklist_templates');
        setCachedRows(
          'checklist_templates',
          [data, ...cached.filter((template) => template.machine_model !== machineModel)]
        );
      }
      void processOfflineSyncQueue();
      return data;
    }
  } catch (err) {
    console.error('Erro ao atualizar template:', err);
    return null;
  }
}

export async function deleteMachine(id: number): Promise<boolean> {
  try {
    if (!isBrowserOnline()) {
      queueDelete('machines', 'machines', id);
      removeCachedRow<any>('machines', id);
      return true;
    }

    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);

    if (error) throw error;
    removeCachedRow<any>('machines', id);
    void processOfflineSyncQueue();
    return true;
  } catch (err) {
    console.error('Erro ao deletar máquina:', err);
    return false;
  }
}

export async function updateMachine(id: number, updates: Partial<Machine>): Promise<Machine | null> {
  try {
    if (!isBrowserOnline()) {
      queueUpdate('machines', 'machines', id, updates as any);
      const cached = getCachedRows<any>('machines');
      const existing = cached.find((m) => m.id === id);
      if (existing) {
        const merged = { ...existing, ...updates };
        upsertCachedRow('machines', merged as any);
        return normalizeMachine(merged);
      }
      return null;
    }

    const { data, error } = await supabase
      .from('machines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (data) upsertCachedRow('machines', data as any);
    void processOfflineSyncQueue();
    return data ? normalizeMachine(data) : null;
  } catch (err) {
    console.error('Erro ao atualizar máquina:', err);
    return null;
  }
}

export async function uploadMachineImage(machineId: number, file: File): Promise<string | null> {
  try {
    if (!isBrowserOnline()) {
      console.warn('Upload de imagem indisponível offline.');
      return null;
    }

    const fileName = `machines/${machineId}/${Date.now()}_${file.name}`;
    const uploaded = await uploadWithBucketFallback(fileName, file, {
      contentType: file.type || undefined,
    });
    return uploaded?.publicUrl || null;
  } catch (err) {
    console.error('Erro ao fazer upload da imagem:', err);
    return null;
  }
}

export async function uploadMachineManual(machineId: number, file: File): Promise<string | null> {
  try {
    if (!isBrowserOnline()) {
      console.warn('Upload de manual indisponível offline.');
      return null;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `manuals/${machineId}/${Date.now()}_${safeName}`;
    const uploaded = await uploadWithBucketFallback(fileName, file, {
      contentType: file.type || undefined,
    });
    return uploaded?.publicUrl || null;
  } catch (err) {
    console.error('Erro ao fazer upload do manual:', err);
    return null;
  }
}
