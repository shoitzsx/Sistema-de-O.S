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
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adminEmail = 'admin@aguia.local';
const adminPassword = '12345';
const testUsername = `teste_${Date.now()}`;

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: adminEmail,
  password: adminPassword,
});

if (signInError || !signInData.session) {
  console.error(JSON.stringify({ step: 'signin', error: signInError?.message || 'no-session' }, null, 2));
  process.exit(1);
}

const accessToken = signInData.session.access_token;

const createResponse = await fetch(`${siteUrl}/api/admin/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    name: 'Usuario Teste API',
    username: testUsername,
    password: '1234',
    role: 'operator',
    allowed_modules: [1],
  }),
});

const createPayload = await createResponse.json().catch(() => null);
if (!createResponse.ok || !createPayload?.user?.id) {
  console.error(JSON.stringify({ step: 'create', status: createResponse.status, payload: createPayload }, null, 2));
  process.exit(1);
}

const deleteResponse = await fetch(`${siteUrl}/api/admin/users`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ id: createPayload.user.id }),
});

const deletePayload = await deleteResponse.json().catch(() => null);
if (!deleteResponse.ok) {
  console.error(JSON.stringify({ step: 'delete', status: deleteResponse.status, payload: deletePayload, createdUser: createPayload.user }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  signin: 'ok',
  createdUserId: createPayload.user.id,
  createdUsername: createPayload.user.username,
  deleted: true,
}, null, 2));
