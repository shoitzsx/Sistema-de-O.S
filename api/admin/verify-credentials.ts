import { createClient } from '@supabase/supabase-js';

function buildAuthEmail(username: string) {
  const normalized = String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${normalized}@aguia.local`;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas nas funcoes server-side.');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getRequesterProfile(authorizationHeader?: string) {
  const token = String(authorizationHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { error: 'Token ausente.', status: 401 as const, profile: null };
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: 'Sessao invalida.', status: 401 as const, profile: null };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: 'Perfil do solicitante nao encontrado.', status: 403 as const, profile: null };
  }

  const normalizedRole = String(profile.role || '').trim().toLowerCase();
  if (normalizedRole !== 'admin' && normalizedRole !== 'administrador') {
    return { error: 'Acesso permitido apenas para administradores.', status: 403 as const, profile: null };
  }

  return { error: null, status: 200 as const, profile };
}

type RequestLike = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: any;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function send(res: ResponseLike, status: number, body: unknown) {
  res.status(status).json(body);
}

function readAuthorization(headers: RequestLike['headers']) {
  const headerValue = headers?.authorization || headers?.Authorization;
  return Array.isArray(headerValue) ? headerValue[0] : headerValue;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Allow', 'POST');

  if (req.method !== 'POST') {
    return send(res, 405, { error: 'Metodo nao permitido.' });
  }

  const requester = await getRequesterProfile(readAuthorization(req.headers));
  const username = String(req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const requiredRole = req.body?.requiredRole ? String(req.body.requiredRole).trim().toLowerCase() : null;

  if (!username || !password) {
    return send(res, 400, { error: 'Usuario e senha sao obrigatorios.' });
  }

  if (requester.error && requester.status !== 403) {
    return send(res, requester.status, { error: requester.error });
  }

  const requesterProfile = requester.profile;
  const isSameUser = String(requesterProfile?.username || '').trim().toLowerCase() === username;
  const isAdmin = String(requesterProfile?.role || '').trim().toLowerCase() === 'admin';

  if (!isAdmin && !isSameUser) {
    return send(res, 403, { error: 'Sem permissao para validar a credencial solicitada.' });
  }

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!anonKey || !supabaseUrl) {
    return send(res, 500, { error: 'Ambiente do Supabase incompleto no backend.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const signIn = await authClient.auth.signInWithPassword({
    email: buildAuthEmail(username),
    password,
  });

  if (signIn.error || !signIn.data.user) {
    return send(res, 200, { valid: false });
  }

  if (requiredRole) {
    const profile = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', signIn.data.user.id)
      .maybeSingle();

    const normalizedRole = String(profile.data?.role || '').trim().toLowerCase();
    if (normalizedRole !== requiredRole) {
      return send(res, 200, { valid: false });
    }
  }

  return send(res, 200, { valid: true });
}