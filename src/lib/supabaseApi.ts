import { supabase, ServiceOrder, Machine, PartTool, User } from './supabase';

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

// ===== MACHINES =====
export async function getMachines(): Promise<Machine[]> {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*');

    if (error) throw error;
    return data || [];
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
    return data;
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
      tools: JSON.parse(order.tools || '[]'),
      used_parts_tools: JSON.parse(order.used_parts_tools || '[]')
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
        tools: JSON.parse(data.tools || '[]'),
        used_parts_tools: JSON.parse(data.used_parts_tools || '[]')
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
        tools: JSON.parse(data.tools || '[]'),
        used_parts_tools: JSON.parse(data.used_parts_tools || '[]')
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
      items: JSON.parse(template.items || '[]')
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
      items: JSON.parse(data.items || '[]')
    } : null;
  } catch (err) {
    console.error('Erro ao buscar template:', err);
    return null;
  }
}
