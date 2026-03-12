import { supabase } from './supabase';

type AuditAction =
  | 'service_order_created'
  | 'service_order_updated'
  | 'service_order_closed'
  | 'service_order_deleted';

interface AuditUser {
  id: number;
  name: string;
  role: string;
}

interface RecordAuditInput {
  action: AuditAction;
  entityId?: number;
  details?: Record<string, unknown>;
  user: AuditUser;
}

export interface LocalAuditLogEntry {
  id: string;
  action: AuditAction;
  entity_id: number | null;
  details: Record<string, unknown>;
  user_id: number;
  user_name: string;
  user_role: string;
  created_at: string;
  sync_status: 'synced' | 'local-only';
}

const AUDIT_STORAGE_KEY = 'audit-logs:v1';
const AUDIT_REMOTE_DISABLED_KEY = 'audit-remote-disabled:v1';

let remoteAuditAllowed: boolean | null = null;

export function isRemoteAuditEnabled() {
  if (remoteAuditAllowed !== null) {
    return remoteAuditAllowed;
  }

  if (typeof window === 'undefined') {
    remoteAuditAllowed = true;
    return true;
  }

  remoteAuditAllowed = localStorage.getItem(AUDIT_REMOTE_DISABLED_KEY) !== '1';
  return remoteAuditAllowed;
}

function disableRemoteAudit() {
  remoteAuditAllowed = false;
  if (typeof window !== 'undefined') {
    localStorage.setItem(AUDIT_REMOTE_DISABLED_KEY, '1');
  }
}

function readAuditLogs(): LocalAuditLogEntry[] {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalAuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function getLocalAuditLogs(): LocalAuditLogEntry[] {
  return readAuditLogs();
}

function writeAuditLogs(rows: LocalAuditLogEntry[]) {
  if (typeof window === 'undefined') return;

  // Keep a bounded log to avoid localStorage growth over time.
  const bounded = rows.slice(0, 1200);
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(bounded));
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export async function recordAuditAction(input: RecordAuditInput): Promise<void> {
  const now = new Date().toISOString();
  const row: LocalAuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    action: input.action,
    entity_id: input.entityId ?? null,
    details: input.details || {},
    user_id: input.user.id,
    user_name: input.user.name,
    user_role: input.user.role,
    created_at: now,
    sync_status: 'local-only'
  };

  const current = readAuditLogs();
  writeAuditLogs([row, ...current]);

  if (!isOnline() || !isRemoteAuditEnabled()) return;

  try {
    const payload = {
      action: row.action,
      entity_type: 'service_orders',
      entity_id: row.entity_id,
      details: row.details,
      user_id: row.user_id,
      user_name: row.user_name,
      user_role: row.user_role,
      created_at: row.created_at
    };

    const { error } = await supabase.from('audit_logs').insert([payload]);

    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        disableRemoteAudit();
      }
      return;
    }

    const next: LocalAuditLogEntry[] = readAuditLogs().map((item) =>
      item.id === row.id
        ? {
            ...item,
            sync_status: 'synced' as const
          }
        : item
    );

    writeAuditLogs(next);
  } catch (err: any) {
    const message = String(err?.message || '');
    if (message.includes('404') || message.toLowerCase().includes('audit_logs')) {
      disableRemoteAudit();
    }
    // Keep local backup if remote table is missing or network fails.
  }
}
