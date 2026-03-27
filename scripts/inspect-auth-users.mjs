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
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [{ data: publicUsers, error: publicError }, authUsersResult] = await Promise.all([
  supabase.from('users').select('id, username, role, auth_user_id, auth_email').order('id', { ascending: true }),
  supabase.auth.admin.listUsers(),
]);

if (publicError) throw publicError;
if (authUsersResult.error) throw authUsersResult.error;

const authUsers = authUsersResult.data.users.map((user) => ({
  id: user.id,
  email: user.email,
  created_at: user.created_at,
}));

console.log(JSON.stringify({ publicUsers, authUsers }, null, 2));
