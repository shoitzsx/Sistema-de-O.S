import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(filePath) {
  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv('.env.vercel.local');

const siteUrl = 'https://aguia-florestal-tawny.vercel.app';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('Missing env vars for smoke test');
}

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function buildAuthEmail(username) {
  return `${String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')}` + '@aguia.local';
}

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const results = [];
const created = {
  serviceOrderIds: [],
  checklistIds: [],
  scheduleIds: [],
  apiUserIds: [],
};

function record(name, ok, details = {}) {
  results.push({ name, ok, ...details });
}

async function test(name, fn) {
  try {
    const details = await fn();
    record(name, true, details || {});
  } catch (error) {
    record(name, false, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function cleanup() {
  if (created.checklistIds.length > 0) {
    await serviceClient.from('checklists').delete().in('id', created.checklistIds);
  }
  if (created.scheduleIds.length > 0) {
    await serviceClient.from('checklist_schedules').delete().in('id', created.scheduleIds);
  }
  if (created.serviceOrderIds.length > 0) {
    await serviceClient.from('service_orders').delete().in('id', created.serviceOrderIds);
  }
  for (const userId of created.apiUserIds) {
    const { data: userRow } = await serviceClient.from('users').select('auth_user_id').eq('id', userId).maybeSingle();
    if (userRow?.auth_user_id) {
      await serviceClient.auth.admin.deleteUser(userRow.auth_user_id);
    }
    await serviceClient.from('users').delete().eq('id', userId);
  }
}

let adminPublicUser;
let operatorOne;
let operatorTwo;
let machine;
let adminClient;
let operatorOneClient;
let operatorTwoClient;
let adminToken;

try {
  const { data: allUsers, error: usersError } = await serviceClient
    .from('users')
    .select('id, name, username, role, allowed_modules, auth_user_id, auth_email')
    .order('id', { ascending: true });
  if (usersError) throw usersError;

  adminPublicUser = (allUsers || []).find((user) => String(user.role).toLowerCase() === 'admin');
  const operators = (allUsers || []).filter((user) => String(user.role).toLowerCase() === 'operator');
  operatorOne = operators[0];
  operatorTwo = operators[1];

  if (!adminPublicUser || !operatorOne || !operatorTwo) {
    throw new Error('Usuarios insuficientes para smoke test');
  }

  const { data: machines, error: machinesError } = await serviceClient
    .from('machines')
    .select('id, name, model')
    .order('id', { ascending: true })
    .limit(1);
  if (machinesError) throw machinesError;
  machine = machines?.[0];
  if (!machine) throw new Error('Nenhuma maquina encontrada');

  await test('Site responde na raiz', async () => {
    const response = await fetch(`${siteUrl}/`);
    const html = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!html.includes('Águia Florestal') && !html.includes('Aguia Florestal')) {
      throw new Error('Marca principal nao encontrada na pagina');
    }
    return { status: response.status };
  });

  for (const route of ['/login', '/manuals', '/checklist', '/checklist-history', '/service-orders', '/history', '/users', '/audit', '/control-panel']) {
    await test(`Rota publica ${route} responde`, async () => {
      const response = await fetch(`${siteUrl}${route}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { status: response.status };
    });
  }

  await test('Buckets machines/manuals existem', async () => {
    const { data, error } = await serviceClient.schema('storage').from('buckets').select('id').in('id', ['machines', 'manuals']);
    if (error) throw error;
    const ids = (data || []).map((item) => item.id).sort();
    if (!ids.includes('machines') || !ids.includes('manuals')) {
      throw new Error(`Buckets encontrados: ${ids.join(', ')}`);
    }
    return { buckets: ids };
  });

  adminClient = createAnonClient();
  operatorOneClient = createAnonClient();
  operatorTwoClient = createAnonClient();

  await test('Login admin funciona', async () => {
    const { data, error } = await adminClient.auth.signInWithPassword({
      email: buildAuthEmail(adminPublicUser.username),
      password: '12345',
    });
    if (error || !data.session) throw new Error(error?.message || 'Sem sessao');
    adminToken = data.session.access_token;
    return { userId: data.user?.id || null };
  });

  await test('Login operador 1 funciona', async () => {
    const { data, error } = await operatorOneClient.auth.signInWithPassword({
      email: buildAuthEmail(operatorOne.username),
      password: '1234',
    });
    if (error || !data.session) throw new Error(error?.message || 'Sem sessao');
    return { userId: data.user?.id || null };
  });

  await test('Login operador 2 funciona', async () => {
    const { data, error } = await operatorTwoClient.auth.signInWithPassword({
      email: buildAuthEmail(operatorTwo.username),
      password: '1234',
    });
    if (error || !data.session) throw new Error(error?.message || 'Sem sessao');
    return { userId: data.user?.id || null };
  });

  await test('Admin le proprio perfil', async () => {
    const { data: sessionData } = await adminClient.auth.getSession();
    const authUserId = sessionData.session?.user.id;
    const { data, error } = await adminClient.from('users').select('id, username, role').eq('auth_user_id', authUserId).single();
    if (error) throw error;
    if (data.username !== adminPublicUser.username) throw new Error('Perfil admin inconsistente');
    return { username: data.username };
  });

  await test('Operador so enxerga proprio usuario', async () => {
    const { data, error } = await operatorOneClient.from('users').select('id, username, role');
    if (error) throw error;
    if (!Array.isArray(data) || data.length !== 1 || data[0].username !== operatorOne.username) {
      throw new Error(`Resultado inesperado: ${JSON.stringify(data)}`);
    }
    return { rows: data.length, username: data[0].username };
  });

  await test('Operador le maquinas', async () => {
    const { data, error } = await operatorOneClient.from('machines').select('id, name').limit(3);
    if (error) throw error;
    if (!data?.length) throw new Error('Nenhuma maquina visivel');
    return { count: data.length };
  });

  let createdScheduleId;
  await test('Admin cria agendamento preventivo', async () => {
    const payload = {
      machine_id: machine.id,
      machine_name: machine.name,
      operator_id: operatorOne.id,
      operator_name: operatorOne.name,
      scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      notes: 'Smoke test automated schedule',
      status: 'draft',
      created_by_id: adminPublicUser.id,
      created_by_name: adminPublicUser.name,
    };
    const { data, error } = await adminClient.from('checklist_schedules').insert([payload]).select('id, status').single();
    if (error) throw error;
    createdScheduleId = data.id;
    created.scheduleIds.push(data.id);
    return { id: data.id, status: data.status };
  });

  await test('Operador dono le o proprio agendamento', async () => {
    const { data, error } = await operatorOneClient.from('checklist_schedules').select('id, operator_id').eq('id', createdScheduleId).single();
    if (error) throw error;
    if (Number(data.operator_id) !== Number(operatorOne.id)) throw new Error('Agendamento fora do escopo do operador');
    return { id: data.id };
  });

  await test('Operador diferente nao le agendamento alheio', async () => {
    const { data, error } = await operatorTwoClient.from('checklist_schedules').select('id').eq('id', createdScheduleId);
    if (error) throw error;
    if ((data || []).length !== 0) throw new Error('Operador indevido conseguiu ler agendamento');
    return { rows: (data || []).length };
  });

  await test('Operador nao cria agendamento preventivo', async () => {
    const payload = {
      machine_id: machine.id,
      machine_name: machine.name,
      operator_id: operatorOne.id,
      operator_name: operatorOne.name,
      scheduled_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      notes: 'Should be denied',
      status: 'draft',
      created_by_id: operatorOne.id,
      created_by_name: operatorOne.name,
    };
    const { error } = await operatorOneClient.from('checklist_schedules').insert([payload]);
    if (!error) throw new Error('Insercao indevida permitida');
    return { code: error.code || null, message: error.message };
  });

  let createdServiceOrderId;
  await test('Operador cria O.S no proprio escopo', async () => {
    const payload = {
      machine_id: machine.id,
      machine_name: machine.name,
      operator_id: operatorOne.id,
      operator_name: operatorOne.name,
      assigned_user_id: null,
      assigned_user_name: null,
      maintenance_type: 'corretiva',
      technician_name: operatorOne.name,
      component: 'Componente teste smoke',
      description: 'Falha detectada no smoke test',
      problem_cause: 'Falha detectada no smoke test',
      tools: JSON.stringify([]),
      used_parts_tools: JSON.stringify([]),
      start_time: new Date().toISOString(),
      status: 'open',
      service_executed: null,
      observations: null,
    };
    const { data, error } = await operatorOneClient.from('service_orders').insert([payload]).select('id, operator_id').single();
    if (error) throw error;
    createdServiceOrderId = data.id;
    created.serviceOrderIds.push(data.id);
    return { id: data.id };
  });

  await test('Operador dono le a propria O.S', async () => {
    const { data, error } = await operatorOneClient.from('service_orders').select('id, operator_id').eq('id', createdServiceOrderId).single();
    if (error) throw error;
    return { id: data.id };
  });

  await test('Operador diferente nao le O.S alheia', async () => {
    const { data, error } = await operatorTwoClient.from('service_orders').select('id').eq('id', createdServiceOrderId);
    if (error) throw error;
    if ((data || []).length !== 0) throw new Error('Operador indevido conseguiu ler O.S');
    return { rows: (data || []).length };
  });

  await test('Admin le O.S criada pelo operador', async () => {
    const { data, error } = await adminClient.from('service_orders').select('id').eq('id', createdServiceOrderId).single();
    if (error) throw error;
    return { id: data.id };
  });

  let createdChecklistId;
  await test('Operador cria checklist proprio', async () => {
    const payload = {
      machine_id: machine.id,
      operator_id: operatorOne.id,
      date: new Date().toISOString(),
      status: 'completed',
      data: JSON.stringify({ smoke: { ok: true } }),
      checklist_started_at: new Date(Date.now() - 60000).toISOString(),
      checklist_finished_at: new Date().toISOString(),
      schedule_id: createdScheduleId,
    };
    const { data, error } = await operatorOneClient.from('checklists').insert([payload]).select('id, operator_id').single();
    if (error) throw error;
    createdChecklistId = data.id;
    created.checklistIds.push(data.id);
    return { id: data.id };
  });

  await test('Operador diferente nao le checklist alheio', async () => {
    const { data, error } = await operatorTwoClient.from('checklists').select('id').eq('id', createdChecklistId);
    if (error) throw error;
    if ((data || []).length !== 0) throw new Error('Operador indevido conseguiu ler checklist');
    return { rows: (data || []).length };
  });

  await test('Admin cria, edita e exclui usuario via API publicada', async () => {
    const username = `smoke_${Date.now()}`;
    const createResponse = await fetch(`${siteUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Usuario Smoke Test',
        username,
        password: '1234',
        role: 'operator',
        allowed_modules: [1, 2],
      }),
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok) throw new Error(`create ${createResponse.status}: ${JSON.stringify(createPayload)}`);
    const userId = createPayload.user.id;
    created.apiUserIds.push(userId);

    const updateResponse = await fetch(`${siteUrl}/api/admin/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        id: userId,
        name: 'Usuario Smoke Test Editado',
        username,
        password: '1234',
        role: 'operator',
        allowed_modules: [1, 2, 3],
      }),
    });
    const updatePayload = await updateResponse.json();
    if (!updateResponse.ok) throw new Error(`update ${updateResponse.status}: ${JSON.stringify(updatePayload)}`);

    const deleteResponse = await fetch(`${siteUrl}/api/admin/users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ id: userId }),
    });
    const deletePayload = await deleteResponse.json();
    if (!deleteResponse.ok) throw new Error(`delete ${deleteResponse.status}: ${JSON.stringify(deletePayload)}`);
    created.apiUserIds = created.apiUserIds.filter((id) => id !== userId);
    return { userId, updatedName: updatePayload.user.name, deleted: deletePayload.success === true };
  });

  await test('Operador nao acessa API administrativa', async () => {
    const { data: operatorSession } = await operatorOneClient.auth.getSession();
    const response = await fetch(`${siteUrl}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorSession.session.access_token}`,
      },
      body: JSON.stringify({
        name: 'Usuario Indevido',
        username: `blocked_${Date.now()}`,
        password: '1234',
        role: 'operator',
        allowed_modules: [1],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (![401, 403].includes(response.status)) {
      throw new Error(`Status inesperado: ${response.status} ${JSON.stringify(payload)}`);
    }
    return { status: response.status };
  });

  await test('API de verificacao de credenciais responde como admin', async () => {
    const response = await fetch(`${siteUrl}/api/admin/verify-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: operatorOne.username,
        password: '1234',
        requiredRole: 'operator',
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.valid !== true) {
      throw new Error(`Resposta inesperada: ${response.status} ${JSON.stringify(payload)}`);
    }
    return { valid: true };
  });
} finally {
  await cleanup().catch(() => {});
}

const passed = results.filter((item) => item.ok).length;
const failed = results.filter((item) => !item.ok).length;
console.log(JSON.stringify({
  siteUrl,
  summary: { total: results.length, passed, failed },
  results,
}, null, 2));
if (failed > 0) {
  process.exitCode = 1;
}
