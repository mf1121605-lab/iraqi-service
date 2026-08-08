import { createContext, useContext, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { usePushToken } from './usePushToken';

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? 'https://iraqi-service.vercel.app';
// Same 5-minute cadence as the web AppShell's heartbeat.
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

interface Profile {
  id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  role: 'customer' | 'employee' | 'founder';
  admin_level: 'founder' | 'co_admin' | null;
  account_status: string;
  avatar_key: string | null;
  bio: string | null;
  is_verified?: boolean;
  onboarding_complete?: boolean | null;
  qualification?: string | null;
  is_active?: boolean;
}

// A co_admin is an employee granted founder-panel access by the founder —
// same panel, same screens, gated the same way `is_co_admin()` gates RLS
// on the web. Use this everywhere instead of checking `role === 'founder'`
// alone so promoted admins actually get in.
export function hasFounderAccess(profile: Profile | null): boolean {
  return !!profile && (profile.role === 'founder' || profile.admin_level === 'co_admin');
}

// A plain employee — no admin_level — gets the simplified supervisor
// dashboard (assigned-requests queue + accept/reject + own profile) rather
// than the founder's full control panel. A co_admin is NOT a supervisor in
// this sense; they already get hasFounderAccess === true above.
export function isSupervisor(profile: Profile | null): boolean {
  return !!profile && profile.role === 'employee' && profile.admin_level !== 'co_admin';
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  usePushToken(session?.user.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) loadProfile(session.user.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Keeps profiles.last_active_at fresh so get_active_employee_candidates()
  // (which filters on it) and the founder's online/offline badges actually
  // see mobile employees — this was previously only wired up on the web
  // AppShell, so employees using the app alone never showed as available.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    async function ping() {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!current?.access_token) return;
      fetch(`${APP_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${current.access_token}` },
      }).catch(() => {});
    }

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [session?.user.id]);

  async function loadProfile(userId: string) {
    // Re-enter the loading state for the duration of the fetch. Without this,
    // signing in left the app at loading=false / session=set / profile=null
    // for the whole round trip, and app/index.tsx — which routes purely off
    // `profile` — saw a null role and redirected straight to the customer
    // screens. The founder's own panel only appeared after a full app
    // restart, because that path loads the profile before index.tsx ever
    // renders. Setting this synchronously (before the first await) means it
    // batches with the setSession() call in the same auth-state callback, so
    // index.tsx never observes the in-between state at all.
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, given_name, family_name, phone, role, admin_level, account_status, avatar_key, bio, is_verified, onboarding_complete, qualification, is_active')
      .eq('id', userId)
      .single();
    // A missing column-level grant makes Postgres reject this whole query
    // (not just that column) — silently falling back to a null profile
    // routes every account to the customer screens with no visible error,
    // so this must never be swallowed again.
    if (error) console.error('loadProfile failed:', error.message);
    setProfile(data);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    // Only app/index.tsx watches `session` and redirects on it — a screen
    // like (customer)/profile.tsx never re-checks auth state on its own,
    // so without this the session/profile just went null in place and the
    // logout button appeared to do nothing (user stuck on the same,
    // now-broken screen). Centralized here so every call site is correct.
    router.replace('/');
  }

  async function refreshProfile() {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) await loadProfile(currentSession.user.id);
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
