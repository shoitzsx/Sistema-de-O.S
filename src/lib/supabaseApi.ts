import { supabase, ServiceOrder, Machine, PartTool, User } from './supabase';

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// ===== USERS =====
export async function loginUser(username: string, password: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error) {
      console.error('Erro ao fazer login:', error);
      return null;
    }

    return data ? {
      ...data,
      allowed_modules: JSON.parse(data.allowed_modules || '[]')
    } : null;
  } catch (err) {
    console.error('Erro ao fazer login:', err);
    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;
    
    return (data || []).map(user => ({
      ...user,
      allowed_modules: JSON.parse(user.allowed_modules || '[]')
    }));
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    return [];
  }
}

export async function createUser(user: Omit<User & { password: string }, 'id'>): Promise<User | null> {
  try {
    const userData = {
      ...user,
      allowed_modules: JSON.stringify(user.allowed_modules || [])
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      allowed_modules: JSON.parse(data.allowed_modules || '[]')
    } : null;
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

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data ? {
      ...data,
      allowed_modules: JSON.parse(data.allowed_modules || '[]')
    } : null;
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return null;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    return false;
  }
}

// ===== MACHINES =====
export async function getMachines(): Promise<Machine[]> {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*');

    if (error) throw error;
    return (data || []).map(machine => ({
      ...machine,
      quick_specs: safeParseJson<string[]>(machine.quick_specs, [])
    }));
  } catch (err) {
    console.error('Erro ao buscar máquinas:', err);
    return [];
  }
}

export async function createMachine(machine: Omit<Machine, 'id'>): Promise<Machine | null> {
  try {
    const { data, error } = await supabase
      .from('machines')
      .insert([machine])
      .select()
      .single();

    if (error) throw error;
    return data
      ? {
          ...data,
          quick_specs: safeParseJson<string[]>(data.quick_specs, [])
        }
      : null;
  } catch (err) {
    console.error('Erro ao criar máquina:', err);
    return null;
  }
}

// ===== PARTS/TOOLS =====
export async function getPartsTools(): Promise<PartTool[]> {
  try {
    const { data, error } = await supabase
      .from('parts_tools')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar peças/ferramentas:', err);
    return [];
  }
}

export async function createPartTool(item: Omit<PartTool, 'id'>): Promise<PartTool | null> {
  try {
    const { data, error } = await supabase
      .from('parts_tools')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erro ao criar peça/ferramenta:', err);
    return null;
  }
}

export async function deletePartTool(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('parts_tools')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao deletar peça/ferramenta:', err);
    return false;
  }
}

// ===== SERVICE ORDERS =====
export async function getServiceOrders(): Promise<ServiceOrder[]> {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(order => ({
      ...order,
      tools: safeParseJson<string[]>(order.tools, []),
      used_parts_tools: safeParseJson<number[]>(order.used_parts_tools, [])
    }));
  } catch (err) {
    console.error('Erro ao buscar ordens de serviço:', err);
    return [];
  }
}

export async function createServiceOrder(order: Omit<ServiceOrder, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceOrder | null> {
  try {
    const orderToInsert = {
      ...order,
      tools: JSON.stringify(order.tools || []),
      used_parts_tools: JSON.stringify(order.used_parts_tools || [])
    };

    const { data, error } = await supabase
      .from('service_orders')
      .insert([orderToInsert])
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
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

    const { data, error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (data) {
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
    return true;
  } catch (err) {
    console.error('Erro ao deletar ordens de serviço por escopo:', err);
    return false;
  }
}

export async function deleteServiceOrdersByIds(ids: number[]): Promise<boolean> {
  try {
    if (!ids.length) return true;

    const { error } = await supabase
      .from('service_orders')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao deletar ordens de serviço por IDs:', err);
    return false;
  }
}

// ===== CHECKLISTS =====
export async function getChecklists(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erro ao buscar checklists:', err);
    return [];
  }
}

export async function createChecklist(checklist: any): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('checklists')
      .insert([{
        ...checklist,
        data: JSON.stringify(checklist.data || {})
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erro ao criar checklist:', err);
    return null;
  }
}

// ===== CHECKLIST TEMPLATES =====
export async function getChecklistTemplates(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*');

    if (error) throw error;
    return (data || []).map(template => ({
      ...template,
      items: safeParseJson(template.items, [])
    }));
  } catch (err) {
    console.error('Erro ao buscar templates:', err);
    return [];
  }
}

export async function getChecklistTemplateByModel(model: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('machine_model', model)
      .single();

    if (error) {
      console.log('Template não encontrado para modelo:', model);
      return null;
    }

    return data ? {
      ...data,
      items: safeParseJson(data.items, [])
    } : null;
  } catch (err) {
    console.error('Erro ao buscar template:', err);
    return null;
  }
}

export async function updateChecklistTemplate(machineModel: string, items: any): Promise<any> {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('machine_model', machineModel)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
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
      return data;
    } else {
      // Create new template
      const { data, error } = await supabase
        .from('checklist_templates')
        .insert([templateData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  } catch (err) {
    console.error('Erro ao atualizar template:', err);
    return null;
  }
}

export async function deleteMachine(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Erro ao deletar máquina:', err);
    return false;
  }
}

export async function updateMachine(id: number, updates: Partial<Machine>): Promise<Machine | null> {
  try {
    const { data, error } = await supabase
      .from('machines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Erro ao atualizar máquina:', err);
    return null;
  }
}

export async function uploadMachineImage(machineId: number, file: File): Promise<string | null> {
  try {
    const fileName = `machines/${machineId}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from('machines')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('machines')
      .getPublicUrl(fileName);

    return publicUrl?.publicUrl || null;
  } catch (err) {
    console.error('Erro ao fazer upload da imagem:', err);
    return null;
  }
}

export async function uploadMachineManual(machineId: number, file: File): Promise<string | null> {
  try {
    const fileName = `manuals/${machineId}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from('machines')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('machines')
      .getPublicUrl(fileName);

    return publicUrl?.publicUrl || null;
  } catch (err) {
    console.error('Erro ao fazer upload do manual:', err);
    return null;
  }
}
