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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalizeUsername = (username) => String(username || '').trim().toLowerCase();
const buildAuthEmail = (username) => `${normalizeUsername(username).replace(/[^a-z0-9._-]/g, '-')}` + '@aguia.local';

const { data: users, error } = await supabase
  .from('users')
  .select('id, name, username, role, allowed_modules, auth_user_id, auth_email')
  .order('id', { ascending: true });

if (error) {
  throw error;
}

const results = [];

for (const user of users || []) {
  const email = user.auth_email || buildAuthEmail(user.username);
  const password = String(user.role || '').toLowerCase() === 'admin' ? '12345' : '1234';

  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: user.username,
      name: user.name,
      public_user_id: user.id,
      role: user.role,
    },
  });

  if (created.error || !created.data.user) {
    results.push({ username: user.username, role: user.role, status: 'error', message: created.error?.message || 'createUser failed' });
    continue;
  }

  const updated = await supabase
    .from('users')
    .update({
      auth_user_id: created.data.user.id,
      auth_email: email,
      password: 'managed-by-supabase-auth',
    })
    .eq('id', user.id)
    .select('id, username, role, auth_user_id, auth_email')
    .single();

  if (updated.error) {
    results.push({ username: user.username, role: user.role, status: 'error', message: updated.error.message });
    continue;
  }

  results.push({
    username: user.username,
    role: user.role,
    status: 'created',
    email,
    password,
    auth_user_id: created.data.user.id,
  });
}

console.log(JSON.stringify(results, null, 2));