import { supabase } from './supabase';

type CacheEntity = 'users' | 'machines' | 'parts_tools' | 'service_orders' | 'checklist_templates';

type QueueOperation =
  | {
      id: string;
      type: 'insert';
      entity: CacheEntity;
      table: string;
      tempId?: number;
      data: Record<string, unknown>;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'update';
      entity: CacheEntity;
      table: string;
      targetId: number;
      data: Record<string, unknown>;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'delete';
      entity: CacheEntity;
      table: string;
      targetId: number;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'deleteMany';
      entity: 'service_orders';
      table: 'service_orders';
      ids: number[];
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'serviceOrderClose';
      entity: 'service_orders';
      table: 'service_orders';
      targetId: number;
      endTime: string;
      finalReport?: string;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'serviceOrdersDeleteScope';
      entity: 'service_orders';
      table: 'service_orders';
      scope: 'all' | 'open' | 'closed';
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'upsertChecklistTemplate';
      entity: 'checklist_templates';
      table: 'checklist_templates';
      machineModel: string;
      items: unknown;
      createdAt: number;
      attempts: number;
      nextRetryAt: number;
      lastError?: string;
    };

const CACHE_PREFIX = 'offline-cache:';
const QUEUE_KEY = 'offline-sync-queue';
const TEMP_ID_KEY = 'offline-temp-id';

let started = false;
let syncing = false;

function nowMs() {
  return Date.now();
}

function getRetryDelay(attempts: number) {
  const base = 4000;
  const max = 5 * 60 * 1000;
  return Math.min(base * 2 ** attempts, max);
}

function isPermissionError(err: unknown): boolean {
  const e = err as any;
  if (e?.status === 401 || e?.status === 403 || e?.code === '42501') return true;
  const msg = `${e?.message || ''} ${e?.details || ''}`.toLowerCase();
  return (
    msg.includes('row level security') ||
    msg.includes('permission denied') ||
    msg.includes('insufficient privilege') ||
    msg.includes('jwt')
  );
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function cacheKey(entity: CacheEntity) {
  return `${CACHE_PREFIX}${entity}`;
}

function readQueue(): QueueOperation[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueueOperation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueueOperation[]) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function nextTempId() {
  const storage = getStorage();
  if (!storage) return -Math.floor(Math.random() * 1000000);
  const currentRaw = storage.getItem(TEMP_ID_KEY);
  const current = currentRaw ? Number(currentRaw) : -1;
  const next = Number.isFinite(current) ? current - 1 : -1;
  storage.setItem(TEMP_ID_KEY, String(next));
  return next;
}

function uuid() {
  const random = Math.random().toString(36).slice(2, 10);
  return `q_${Date.now()}_${random}`;
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function getCachedRows<T>(entity: CacheEntity): T[] {
  const storage = getStorage();
  if (!storage) return [];
  const raw = storage.getItem(cacheKey(entity));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function setCachedRows<T>(entity: CacheEntity, rows: T[]) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(cacheKey(entity), JSON.stringify(rows || []));
}

export function upsertCachedRow<T extends { id: number }>(entity: CacheEntity, row: T) {
  const rows = getCachedRows<T>(entity);
  const idx = rows.findIndex((item) => item.id === row.id);
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.unshift(row);
  }
  setCachedRows(entity, rows);
}

export function removeCachedRow<T extends { id: number }>(entity: CacheEntity, id: number) {
  const rows = getCachedRows<T>(entity).filter((item) => item.id !== id);
  setCachedRows(entity, rows);
}

function replaceCachedTempId<T extends { id: number }>(entity: CacheEntity, tempId: number, remoteId: number) {
  const rows = getCachedRows<T>(entity);
  const idx = rows.findIndex((item) => item.id === tempId);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], id: remoteId } as T;
    setCachedRows(entity, rows);
  }
}

function replaceQueuedTempId(tempId: number, remoteId: number) {
  const queue = readQueue().map((op) => {
    if ('targetId' in op && op.targetId === tempId) {
      return { ...op, targetId: remoteId } as QueueOperation;
    }
    if (op.type === 'deleteMany') {
      return {
        ...op,
        ids: op.ids.map((id) => (id === tempId ? remoteId : id))
      } as QueueOperation;
    }
    return op;
  });
  writeQueue(queue);
}

export function queueInsert(entity: CacheEntity, table: string, data: Record<string, unknown>) {
  const tempId = nextTempId();
  const op: QueueOperation = {
    id: uuid(),
    type: 'insert',
    entity,
    table,
    tempId,
    data,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  };
  const queue = readQueue();
  queue.push(op);
  writeQueue(queue);
  return tempId;
}

export function queueUpdate(entity: CacheEntity, table: string, targetId: number, data: Record<string, unknown>) {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    type: 'update',
    entity,
    table,
    targetId,
    data,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  });
  writeQueue(queue);
}

export function queueDelete(entity: CacheEntity, table: string, targetId: number) {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    type: 'delete',
    entity,
    table,
    targetId,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  });
  writeQueue(queue);
}

export function queueDeleteManyServiceOrders(ids: number[]) {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    type: 'deleteMany',
    entity: 'service_orders',
    table: 'service_orders',
    ids,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  });
  writeQueue(queue);
}

export function queueCloseServiceOrder(targetId: number, endTime: string, finalReport?: string) {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    type: 'serviceOrderClose',
    entity: 'service_orders',
    table: 'service_orders',
    targetId,
    endTime,
    finalReport,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  });
  writeQueue(queue);
}

export function queueDeleteServiceOrdersByScope(scope: 'all' | 'open' | 'closed') {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    type: 'serviceOrdersDeleteScope',
    entity: 'service_orders',
    table: 'service_orders',
    scope,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  });
  writeQueue(queue);
}

export function queueUpsertChecklistTemplate(machineModel: string, items: unknown) {
  const queue = readQueue();
  queue.push({
    id: uuid(),
    type: 'upsertChecklistTemplate',
    entity: 'checklist_templates',
    table: 'checklist_templates',
    machineModel,
    items,
    createdAt: nowMs(),
    attempts: 0,
    nextRetryAt: nowMs()
  });
  writeQueue(queue);
}

export function getOfflineSyncSummary() {
  const queue = readQueue();
  const blocked = queue.filter((op) => Boolean((op as any).permissionBlocked)).length;
  const active = queue.filter((op) => !Boolean((op as any).permissionBlocked));
  const pending = active.length;
  const error = active.filter((op) => Boolean(op.lastError)).length;
  return { pending, error, blocked, online: isBrowserOnline() };
}

export function clearPermissionBlockedItems() {
  const queue = readQueue().filter((op) => !Boolean((op as any).permissionBlocked));
  writeQueue(queue);
}

/** Remove lastError e reseta nextRetryAt de todos os itens com erro (sem deletar os dados pendentes). */
export function clearAllQueueErrors() {
  const queue = readQueue().map((op) => ({
    ...op,
    lastError: undefined,
    attempts: 0,
    nextRetryAt: nowMs(),
    ...({ permissionBlocked: false } as any)
  })) as QueueOperation[];
  writeQueue(queue);
}

async function processOperation(op: QueueOperation) {
  if (op.type === 'insert') {
    const { data, error, status } = await supabase.from(op.table).insert([op.data]).select().single();
    if (error) {
      const enriched = Object.assign(Object.create(Object.getPrototypeOf(error)), error, { status });
      throw enriched;
    }

    if (op.tempId !== undefined && data?.id !== undefined) {
      replaceCachedTempId(op.entity, op.tempId, Number(data.id));
      replaceQueuedTempId(op.tempId, Number(data.id));
    }
    return;
  }

  if (op.type === 'update') {
    const { error, status } = await supabase.from(op.table).update(op.data).eq('id', op.targetId);
    if (error) {
      const enriched = Object.assign(Object.create(Object.getPrototypeOf(error)), error, { status });
      throw enriched;
    }
    return;
  }

  if (op.type === 'delete') {
    const { error, status } = await supabase.from(op.table).delete().eq('id', op.targetId);
    if (error) {
      const enriched = Object.assign(Object.create(Object.getPrototypeOf(error)), error, { status });
      throw enriched;
    }
    return;
  }

  if (op.type === 'deleteMany') {
    const { error } = await supabase.from(op.table).delete().in('id', op.ids);
    if (error) throw error;
    return;
  }

  if (op.type === 'serviceOrderClose') {
    const updates: Record<string, unknown> = {
      status: 'closed',
      end_time: op.endTime
    };
    if (op.finalReport !== undefined) {
      updates.final_report = op.finalReport;
    }

    const { error } = await supabase
      .from(op.table)
      .update(updates)
      .eq('id', op.targetId);
    if (error) throw error;
    return;
  }

  if (op.type === 'serviceOrdersDeleteScope') {
    let query = supabase.from(op.table).delete();

    if (op.scope === 'open') {
      query = query.eq('status', 'open');
    } else if (op.scope === 'closed') {
      query = query.eq('status', 'closed');
    } else {
      query = query.in('status', ['open', 'closed']);
    }

    const { error } = await query;
    if (error) throw error;
    return;
  }

  if (op.type === 'upsertChecklistTemplate') {
    const { error } = await supabase
      .from(op.table)
      .upsert(
        {
          machine_model: op.machineModel,
          items: JSON.stringify(op.items)
        },
        { onConflict: 'machine_model' }
      );
    if (error) throw error;
    return;
  }
}

export async function processOfflineSyncQueue(force = false) {
  if (!isBrowserOnline() || syncing) return;

  syncing = true;

  try {
    const queue = readQueue();
    if (!queue.length) return;

    const now = nowMs();
    const remaining: QueueOperation[] = [];

    for (const op of queue) {
      const isBlocked = Boolean((op as any).permissionBlocked);

      // Auto-sync: pula itens em backoff ou bloqueados por permissão.
      if (!force && (op.nextRetryAt > now || isBlocked)) {
        remaining.push(op);
        continue;
      }

      // Sync manual (force): reseta flags de erro para tentar de novo.
      if (force && isBlocked) {
        (op as any).permissionBlocked = false;
        op.attempts = 0;
        op.nextRetryAt = nowMs();
        op.lastError = undefined;
      }

      try {
        await processOperation(op);
      } catch (error) {
        const attempts = op.attempts + 1;
        if (isPermissionError(error)) {
          // Erro de permissão permanente (RLS/401): não adianta retentar automaticamente.
          // Marca como bloqueado para parar os retries até que a policy seja corrigida.
          remaining.push({
            ...op,
            attempts,
            nextRetryAt: nowMs() + 7 * 24 * 60 * 60 * 1000,
            lastError: error instanceof Error ? error.message : String(error),
            ...({ permissionBlocked: true } as any)
          } as QueueOperation);
        } else {
          remaining.push({
            ...op,
            attempts,
            nextRetryAt: nowMs() + getRetryDelay(attempts),
            lastError: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    writeQueue(remaining);
  } finally {
    syncing = false;
  }
}

export function startOfflineSyncWorker() {
  if (started) return;
  started = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      void processOfflineSyncQueue();
    });
  }

  setTimeout(() => {
    void processOfflineSyncQueue();
  }, 1500);

  setInterval(() => {
    void processOfflineSyncQueue();
  }, 30000);
}
