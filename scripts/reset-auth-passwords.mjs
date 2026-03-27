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

const { data: users, error } = await supabase
  .from('users')
  .select('id, name, username, role, auth_user_id')
  .order('id', { ascending: true });

if (error) {
  throw error;
}

const results = [];
for (const user of users || []) {
  if (!user.auth_user_id) {
    results.push({ username: user.username, role: user.role, status: 'skipped-no-auth-user' });
    continue;
  }

  const password = String(user.role || '').toLowerCase() === 'admin' ? '12345' : '1234';
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.auth_user_id, { password });

  if (updateError) {
    results.push({ username: user.username, role: user.role, status: 'error', message: updateError.message });
    continue;
  }

  results.push({ username: user.username, role: user.role, status: 'updated', password });
}

console.log(JSON.stringify(results, null, 2));
