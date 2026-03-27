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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

loadEnv('.env.vercel.local');

const siteUrl = 'https://aguia-florestal-tawny.vercel.app';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: 'admin@aguia.local',
  password: '12345',
});

if (signInError || !signInData.session) {
  console.error(JSON.stringify({ step: 'signin', error: signInError?.message || 'no-session' }, null, 2));
  process.exit(1);
}

const accessToken = signInData.session.access_token;
const username = `shortpass_${Date.now()}`;

const createResponse = await fetch(`${siteUrl}/api/admin/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ name: 'Usuario Short Password', username, password: '1234', role: 'operator', allowed_modules: [1] }),
});
const createPayload = await createResponse.json();
if (!createResponse.ok) {
  console.error(JSON.stringify({ step: 'create', status: createResponse.status, payload: createPayload }, null, 2));
  process.exit(1);
}

const userId = createPayload.user.id;
const updateResponse = await fetch(`${siteUrl}/api/admin/users`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ id: userId, name: 'Usuario Short Password', username, role: 'operator', allowed_modules: [1], password: '1234' }),
});
const updatePayload = await updateResponse.json();

const deleteResponse = await fetch(`${siteUrl}/api/admin/users`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ id: userId }),
});
await deleteResponse.json().catch(() => null);

console.log(JSON.stringify({
  updateStatus: updateResponse.status,
  updatePayload,
}, null, 2));
if (updateResponse.status !== 400) process.exit(1);
