import { supabase } from './supabase';

export async function signInWithEmail(email, password) {
  if (!supabase) return { error: { message: 'Supabase is not configured' } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
