import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireFounderOrCoAdmin } from '../../../lib/founderAuth';

const PROFILE_FIELDS = 'id, given_name, family_name, username, phone, account_status, admin_level, created_at, last_active_at';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const auth = await requireFounderOrCoAdmin(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  // The passcode gate is a secondary UX confirmation on top of the real
  // authorization check above (founder/co_admin session) — it lives in an
  // env var, never in source, so it's never visible in the client bundle
  // or git history.
  const expectedPasscode = process.env.FOUNDER_USERS_PASSCODE;
  if (!expectedPasscode) {
    return res.status(500).json({ error: 'FOUNDER_USERS_PASSCODE is not configured' });
  }
  const provided = String(req.body?.passcode ?? '');
  const expected = String(expectedPasscode);
  const match =
    provided.length === expected.length &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!match) {
    return res.status(401).json({ error: 'invalid_passcode' });
  }

  const [{ data: customers, error: customersError }, { data: employees, error: employeesError }] = await Promise.all([
    supabaseAdmin.from('profiles').select(PROFILE_FIELDS).eq('role', 'customer').order('created_at', { ascending: false }),
    supabaseAdmin.from('profiles').select(PROFILE_FIELDS).eq('role', 'employee').order('created_at', { ascending: false }),
  ]);

  if (customersError || employeesError) {
    return res.status(400).json({ error: (customersError || employeesError).message });
  }

  const employeeIds = (employees ?? []).map((employee) => employee.id);
  const lastLoginByUserId = {};
  if (employeeIds.length > 0) {
    const { data: logins } = await supabaseAdmin
      .from('login_audit_logs')
      .select('user_id, logged_at')
      .in('user_id', employeeIds)
      .order('logged_at', { ascending: false });
    for (const login of logins ?? []) {
      if (!lastLoginByUserId[login.user_id]) {
        lastLoginByUserId[login.user_id] = login.logged_at;
      }
    }
  }

  return res.status(200).json({
    customers: customers ?? [],
    employees: (employees ?? []).map((employee) => ({ ...employee, last_login_at: lastLoginByUserId[employee.id] ?? null })),
  });
}
