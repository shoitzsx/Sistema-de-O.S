import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas!');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Tipos para TypeScript
export interface User {
  id: number;
  name: string;
  username: string;
  role: 'admin' | 'operator';
  allowed_modules: number[];
}

export interface Machine {
  id: number;
  name: string;
  model?: string;
  image_url?: string;
  manual_url?: string;
  description?: string;
  quick_specs?: string[];
}

export interface ServiceOrder {
  id: number;
  machine_id: number;
  machine_name: string;
  operator_id: number;
  operator_name: string;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  maintenance_type: 'preventiva' | 'corretiva';
  technician_name: string;
  component: string;
  description: string;
  tools: string[];
  used_parts_tools: number[];
  start_time: string;
  end_time: string | null;
  status: 'open' | 'closed';
  final_report?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PartTool {
  id: number;
  name: string;
  description?: string;
  category: 'part' | 'tool';
  created_at?: string;
}

export interface Checklist {
  id: number;
  machine_id: number;
  operator_id: number;
  date: string;
  status: 'pending' | 'completed';
  data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistTemplate {
  id: number;
  machine_model: string;
  items: Array<{
    category: string;
    items: string[];
  }>;
  created_at?: string;
}

export interface ChecklistSchedule {
  id: number | string;
  machine_id: number;
  machine_name: string;
  operator_id: number;
  operator_name: string;
  scheduled_date: string;
  notes?: string;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at?: string | null;
  created_by_id: number;
  created_by_name: string;
  created_at?: string;
  sync_status?: 'synced' | 'local-only';
}

export interface UserNotification {
  id: string;
  user_id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  entity_id?: number | null;
  created_at: string;
}
