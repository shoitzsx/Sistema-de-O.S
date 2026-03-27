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

function normalizeUserRow(row: any) {
  return {
    ...row,
    auth_user_id: row.auth_user_id ? String(row.auth_user_id) : null,
    auth_email: row.auth_email ? String(row.auth_email) : null,
    allowed_modules: Array.isArray(row.allowed_modules)
      ? row.allowed_modules
      : typeof row.allowed_modules === 'string'
        ? JSON.parse(row.allowed_modules || '[]')
        : [],
  };
}

async function hasLinkedRecords(userId: number) {
  const [serviceOrders, assignedOrders, checklists, schedules, createdSchedules] = await Promise.all([
    supabaseAdmin.from('service_orders').select('id', { count: 'exact', head: true }).eq('operator_id', userId),
    supabaseAdmin.from('service_orders').select('id', { count: 'exact', head: true }).eq('assigned_user_id', userId),
    supabaseAdmin.from('checklists').select('id', { count: 'exact', head: true }).eq('operator_id', userId),
    supabaseAdmin.from('checklist_schedules').select('id', { count: 'exact', head: true }).eq('operator_id', userId),
    supabaseAdmin.from('checklist_schedules').select('id', { count: 'exact', head: true }).eq('created_by_id', userId),
  ]);

  return [serviceOrders, assignedOrders, checklists, schedules, createdSchedules].some((result) => Number(result.count || 0) > 0);
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Allow', 'POST,PUT,DELETE');

  const requester = await getRequesterProfile(readAuthorization(req.headers));
  if (requester.error) {
    return send(res, requester.status, { error: requester.error });
  }

  if (req.method === 'POST') {
    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const role = String(req.body?.role || 'operator').trim().toLowerCase();
    const allowedModules = Array.isArray(req.body?.allowed_modules) ? req.body.allowed_modules : [];

    if (!name || !username || !password) {
      return send(res, 400, { error: 'Nome, usuario e senha sao obrigatorios.' });
    }

    const authEmail = buildAuthEmail(username);
    const existing = await supabaseAdmin
      .from('users')
      .select('id')
      .or(`username.eq.${username},auth_email.eq.${authEmail}`)
      .limit(1);

    if ((existing.data || []).length > 0) {
      return send(res, 409, { error: 'Ja existe um usuario com esse login.', code: 'duplicate_user' });
    }

    const createdAuth = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        name,
      },
    });

    if (createdAuth.error || !createdAuth.data.user) {
      return send(res, 400, { error: createdAuth.error?.message || 'Falha ao criar usuario no Auth.' });
    }

    const inserted = await supabaseAdmin
      .from('users')
      .insert([{
        auth_user_id: createdAuth.data.user.id,
        auth_email: authEmail,
        name,
        username,
        password: 'managed-by-supabase-auth',
        role,
        allowed_modules: JSON.stringify(allowedModules),
      }])
      .select('*')
      .single();

    if (inserted.error || !inserted.data) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuth.data.user.id);
      return send(res, 400, { error: inserted.error?.message || 'Falha ao criar perfil publico do usuario.' });
    }

    return send(res, 200, { user: normalizeUserRow(inserted.data) });
  }

  if (req.method === 'PUT') {
    const userId = Number(req.body?.id || 0);
    if (!userId) {
      return send(res, 400, { error: 'ID do usuario e obrigatorio.' });
    }

    const existing = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return send(res, 404, { error: 'Usuario nao encontrado.' });
    }

    const username = req.body?.username !== undefined
      ? String(req.body.username || '').trim().toLowerCase()
      : String(existing.data.username || '').trim().toLowerCase();
    const name = req.body?.name !== undefined ? String(req.body.name || '').trim() : String(existing.data.name || '');
    const role = req.body?.role !== undefined ? String(req.body.role || 'operator').trim().toLowerCase() : String(existing.data.role || 'operator');
    const allowedModules = req.body?.allowed_modules !== undefined
      ? (Array.isArray(req.body.allowed_modules) ? req.body.allowed_modules : [])
      : (typeof existing.data.allowed_modules === 'string' ? JSON.parse(existing.data.allowed_modules || '[]') : existing.data.allowed_modules || []);
    const nextAuthEmail = buildAuthEmail(username);

    const duplicate = await supabaseAdmin
      .from('users')
      .select('id')
      .neq('id', userId)
      .or(`username.eq.${username},auth_email.eq.${nextAuthEmail}`)
      .limit(1);

    if ((duplicate.data || []).length > 0) {
      return send(res, 409, { error: 'Ja existe um usuario com esse login.', code: 'duplicate_user' });
    }

    if (req.body?.password !== undefined && String(req.body.password || '').trim().length > 0 && String(req.body.password || '').trim().length < 6) {
      return send(res, 400, { error: 'A nova senha precisa ter no minimo 6 caracteres.', code: 'password_too_short' });
    }

    if (existing.data.auth_user_id) {
      const authUpdate = await supabaseAdmin.auth.admin.updateUserById(existing.data.auth_user_id, {
        email: nextAuthEmail,
        ...(req.body?.password ? { password: String(req.body.password) } : {}),
        user_metadata: {
          username,
          name,
        },
      });

      if (authUpdate.error) {
        return send(res, 400, { error: authUpdate.error.message || 'Falha ao atualizar usuario no Auth.' });
      }
    }

    const updated = await supabaseAdmin
      .from('users')
      .update({
        name,
        username,
        auth_email: nextAuthEmail,
        role,
        allowed_modules: JSON.stringify(allowedModules),
        ...(req.body?.password ? { password: 'managed-by-supabase-auth' } : {}),
      })
      .eq('id', userId)
      .select('*')
      .single();

    if (updated.error || !updated.data) {
      return send(res, 400, { error: updated.error?.message || 'Falha ao atualizar perfil publico do usuario.' });
    }

    return send(res, 200, { user: normalizeUserRow(updated.data) });
  }

  if (req.method === 'DELETE') {
    const userId = Number(req.body?.id || 0);
    if (!userId) {
      return send(res, 400, { error: 'ID do usuario e obrigatorio.' });
    }

    const existing = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing.error || !existing.data) {
      return send(res, 404, { error: 'Usuario nao encontrado.' });
    }

    if (await hasLinkedRecords(userId)) {
      return send(res, 409, { error: 'Nao e possivel remover usuario com registros operacionais vinculados.', code: 'user_has_dependencies' });
    }

    if (existing.data.auth_user_id) {
      const deletedAuth = await supabaseAdmin.auth.admin.deleteUser(existing.data.auth_user_id);
      if (deletedAuth.error) {
        return send(res, 400, { error: deletedAuth.error.message || 'Falha ao remover usuario do Auth.' });
      }
    }

    const deleted = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleted.error) {
      return send(res, 400, { error: deleted.error.message || 'Falha ao remover perfil publico do usuario.' });
    }

    return send(res, 200, { success: true });
  }

  return send(res, 405, { error: 'Metodo nao permitido.' });
}

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