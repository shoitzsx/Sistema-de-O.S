import Dexie, { type Table } from 'dexie';
import { supabase } from './supabase';

interface OfflineChecklistRecord {
  id?: number;
  local_id: string;
  operator_id: number;
  machine_id: number;
  date: string;
  status: string;
  data: string;
  sync_status: 'pending' | 'syncing' | 'synced' | 'error';
  remote_id?: number;
  last_error?: string;
  created_at: number;
  updated_at: number;
}

interface SyncQueueRecord {
  id?: number;
  entity: 'checklist';
  action: 'create';
  local_ref: string;
  payload: string;
  status: 'pending' | 'syncing' | 'error';
  attempts: number;
  last_error?: string;
  next_retry_at: number;
  created_at: number;
  updated_at: number;
}

interface ChecklistPayload {
  machine_id: number;
  operator_id: number;
  date: string;
  data: unknown;
  status: string;
}

class ChecklistOfflineDatabase extends Dexie {
  offline_checklists!: Table<OfflineChecklistRecord>;
  sync_queue!: Table<SyncQueueRecord>;

  constructor() {
    super('aguia-florestal-offline');

    this.version(1).stores({
      offline_checklists: '++id,&local_id,operator_id,machine_id,sync_status,updated_at',
      sync_queue: '++id,entity,status,local_ref,next_retry_at,updated_at'
    });
  }
}

const db = new ChecklistOfflineDatabase();

let syncStarted = false;
let syncInProgress = false;

function nowMs() {
  return Date.now();
}

function createLocalId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `chk_${nowMs()}_${randomPart}`;
}

function parseStoredData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function queueChecklistForSync(payload: ChecklistPayload) {
  const localId = createLocalId();
  const timestamp = nowMs();
  const dataAsString = JSON.stringify(payload.data || {});

  await db.transaction('rw', db.offline_checklists, db.sync_queue, async () => {
    await db.offline_checklists.add({
      local_id: localId,
      operator_id: payload.operator_id,
      machine_id: payload.machine_id,
      date: payload.date,
      status: payload.status,
      data: dataAsString,
      sync_status: 'pending',
      created_at: timestamp,
      updated_at: timestamp
    });

    await db.sync_queue.add({
      entity: 'checklist',
      action: 'create',
      local_ref: localId,
      payload: JSON.stringify(payload),
      status: 'pending',
      attempts: 0,
      next_retry_at: timestamp,
      created_at: timestamp,
      updated_at: timestamp
    });
  });

  return {
    id: `local-${localId}`,
    local_id: localId,
    ...payload,
    created_at: new Date(timestamp).toISOString(),
    updated_at: new Date(timestamp).toISOString(),
    __sync: 'pending'
  };
}

export async function getUnsyncedChecklists() {
  const localRows = await db.offline_checklists
    .where('sync_status')
    .anyOf(['pending', 'syncing', 'error'])
    .toArray();

  return localRows
    .sort((a, b) => b.updated_at - a.updated_at)
    .map((row) => ({
      id: `local-${row.local_id}`,
      machine_id: row.machine_id,
      operator_id: row.operator_id,
      date: row.date,
      status: row.status,
      data: parseStoredData(row.data),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      __sync: row.sync_status,
      __sync_error: row.last_error || null
    }));
}

export async function getOfflineChecklistSyncSummary() {
  const [pending, error] = await Promise.all([
    db.offline_checklists.where('sync_status').anyOf(['pending', 'syncing']).count(),
    db.offline_checklists.where('sync_status').equals('error').count()
  ]);

  return {
    pending,
    error,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true
  };
}

async function trySyncChecklist(localRef: string, payload: ChecklistPayload) {
  const existing = await supabase
    .from('checklists')
    .select('id')
    .eq('operator_id', payload.operator_id)
    .eq('machine_id', payload.machine_id)
    .eq('date', payload.date)
    .limit(1)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data?.id) {
    return existing.data.id as number;
  }

  const created = await supabase
    .from('checklists')
    .insert([
      {
        machine_id: payload.machine_id,
        operator_id: payload.operator_id,
        date: payload.date,
        status: payload.status,
        data: JSON.stringify(payload.data || {})
      }
    ])
    .select('id')
    .single();

  if (created.error) throw created.error;

  return created.data?.id as number;
}

function getRetryDelayMs(attempts: number) {
  const base = 5000;
  const max = 10 * 60 * 1000;
  return Math.min(base * 2 ** attempts, max);
}

export async function processChecklistSyncQueue() {
  if (syncInProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  syncInProgress = true;

  try {
    const currentTime = nowMs();

    const items = await db.sync_queue
      .where('status')
      .anyOf(['pending', 'error'])
      .filter((entry) => entry.next_retry_at <= currentTime)
      .sortBy('created_at');

    for (const item of items) {
      const queueId = item.id;
      if (!queueId) continue;

      await db.sync_queue.update(queueId, {
        status: 'syncing',
        updated_at: nowMs()
      });
      await db.offline_checklists.where('local_id').equals(item.local_ref).modify({
        sync_status: 'syncing',
        updated_at: nowMs(),
        last_error: ''
      });

      try {
        const payload = JSON.parse(item.payload) as ChecklistPayload;
        const remoteId = await trySyncChecklist(item.local_ref, payload);

        await db.offline_checklists.where('local_id').equals(item.local_ref).modify({
          sync_status: 'synced',
          remote_id: remoteId,
          updated_at: nowMs(),
          last_error: ''
        });

        await db.sync_queue.delete(queueId);
      } catch (error) {
        const attempts = item.attempts + 1;
        const errorMessage = error instanceof Error ? error.message : String(error);

        await db.sync_queue.update(queueId, {
          status: 'error',
          attempts,
          last_error: errorMessage,
          next_retry_at: nowMs() + getRetryDelayMs(attempts),
          updated_at: nowMs()
        });

        await db.offline_checklists.where('local_id').equals(item.local_ref).modify({
          sync_status: 'error',
          last_error: errorMessage,
          updated_at: nowMs()
        });
      }
    }
  } finally {
    syncInProgress = false;
  }
}

export function startChecklistSyncWorker() {
  if (syncStarted) return;
  syncStarted = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      void processChecklistSyncQueue();
    });
  }

  setTimeout(() => {
    void processChecklistSyncQueue();
  }, 1200);

  setInterval(() => {
    void processChecklistSyncQueue();
  }, 30000);
}
