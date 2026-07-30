import { supabase } from './supabase';

export async function signInWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Supabase is not configured' } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export async function getCurrentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export async function getMyProfile() {
  if (!supabase) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, admin_level, given_name, father_name, grandfather_name, family_name, email, phone, specialization, account_status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}

export function resolveDashboardRoute(profile) {
  if (!profile) return 'Dashboard';
  if (profile.role === 'founder' || profile.admin_level === 'founder' || profile.admin_level === 'co_admin') {
    return 'FounderDashboard';
  }
  if (profile.role === 'employee') {
    return 'EmployeeDashboard';
  }
  return 'Dashboard';
}

export function formatFullName(profile) {
  if (!profile) return 'مستخدم منصة الخدمات';
  const parts = [profile.given_name, profile.father_name, profile.grandfather_name, profile.family_name].filter(Boolean);
  return parts.length ? parts.join(' ') : (profile.email || 'مستخدم منصة الخدمات');
}

export function roleLabel(profile) {
  if (!profile) return 'زائر';
  if (profile.role === 'founder' || profile.admin_level === 'founder') return 'المؤسس';
  if (profile.admin_level === 'co_admin') return 'مسؤول مشارك';
  if (profile.role === 'employee') return 'موظف';
  return 'عميل';
}
