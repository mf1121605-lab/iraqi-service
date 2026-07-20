import { supabaseAdmin } from './supabaseAdmin';

// Resolves the caller from their bearer token and checks they're allowed to
// perform founder/co_admin-level actions. Used by every pages/api/founder/*
// route, since those routes run with the service-role key (bypasses RLS
// and the column-privilege restrictions on profiles), so the authorization
// check has to happen here instead.
export async function requireFounderOrCoAdmin(req) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: 'missing bearer token', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: 'invalid session', status: 401 };
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, admin_level')
    .eq('id', userData.user.id)
    .single();

  if (!callerProfile || (callerProfile.role !== 'founder' && callerProfile.admin_level !== 'co_admin')) {
    return { error: 'founder or co_admin only', status: 403 };
  }

  return { caller: callerProfile };
}

// Same shape as requireFounderOrCoAdmin, but for routes any staff member
// (founder or employee) may use — mirrors the is_staff() RLS helper, since
// /hq/news-links itself is already open to both roles.
export async function requireStaff(req) {
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { error: 'missing bearer token', status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: 'invalid session', status: 401 };
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, admin_level')
    .eq('id', userData.user.id)
    .single();

  if (!callerProfile || !['founder', 'employee'].includes(callerProfile.role)) {
    return { error: 'staff only', status: 403 };
  }

  return { caller: callerProfile };
}
