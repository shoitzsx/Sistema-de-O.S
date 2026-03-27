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

const username = process.argv[2];
const password = process.argv[3];
const email = `${String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-')}` + '@aguia.local';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
console.log(JSON.stringify({ email, hasSession: Boolean(data.session), userId: data.user?.id || null, error: error ? { message: error.message, status: error.status, code: error.code } : null }, null, 2));
