import Dexie, { type Table } from 'dexie';

export interface OfflineManualRecord {
  id?: number;
  machine_id: number;
  remote_url: string | null;
  file_name: string;
  mime_type: string;
  size: number;
  blob: Blob;
  updated_at: number;
}

class ManualsOfflineDatabase extends Dexie {
  manuals!: Table<OfflineManualRecord>;

  constructor() {
    super('aguia-florestal-manuals');

    this.version(1).stores({
      manuals: '++id,&machine_id,remote_url,updated_at'
    });
  }
}

const db = new ManualsOfflineDatabase();

function nowMs() {
  return Date.now();
}

function inferMimeTypeFromUrl(url: string | null | undefined) {
  const normalizedUrl = String(url || '').toLowerCase();
  if (normalizedUrl.endsWith('.pdf')) return 'application/pdf';
  if (normalizedUrl.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (normalizedUrl.endsWith('.doc')) return 'application/msword';
  return 'application/octet-stream';
}

function inferFileNameFromUrl(url: string | null | undefined) {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) return 'manual';

  try {
    const parsed = new URL(normalizedUrl);
    const candidate = parsed.pathname.split('/').pop();
    return candidate || 'manual';
  } catch {
    const parts = normalizedUrl.split('/');
    return parts[parts.length - 1] || 'manual';
  }
}

export function isPdfManual(manualUrl?: string | null, mimeType?: string | null) {
  const normalizedMimeType = String(mimeType || '').toLowerCase();
  if (normalizedMimeType.includes('pdf')) return true;
  return inferMimeTypeFromUrl(manualUrl).includes('pdf');
}

export async function getCachedManual(machineId: number) {
  return db.manuals.where('machine_id').equals(machineId).first();
}

export async function getCachedManualMachineIds() {
  const rows = await db.manuals.toArray();
  return rows.map((row) => row.machine_id);
}

export async function cacheUploadedManual(machineId: number, file: File, remoteUrl?: string | null) {
  await db.manuals.put({
    machine_id: machineId,
    remote_url: remoteUrl || null,
    file_name: file.name || inferFileNameFromUrl(remoteUrl),
    mime_type: file.type || inferMimeTypeFromUrl(remoteUrl),
    size: file.size,
    blob: file,
    updated_at: nowMs(),
  });
}

export async function fetchAndCacheManual(machineId: number, manualUrl: string) {
  const response = await fetch(manualUrl, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar manual: ${response.status}`);
  }

  const blob = await response.blob();
  const mimeType = response.headers.get('content-type') || blob.type || inferMimeTypeFromUrl(manualUrl);

  const record: OfflineManualRecord = {
    machine_id: machineId,
    remote_url: manualUrl,
    file_name: inferFileNameFromUrl(manualUrl),
    mime_type: mimeType,
    size: blob.size,
    blob,
    updated_at: nowMs(),
  };

  await db.manuals.put(record);
  return record;
}