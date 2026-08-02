import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  given_name: string | null;
  family_name: string | null;
  phone: string | null;
  role: 'customer' | 'employee' | 'founder';
  admin_level: 'founder' | 'co_admin' | null;
  account_status: string;
  avatar_key: string | null;
  is_verified?: boolean;
  onboarding_complete?: boolean | null;
}

// A co_admin is an employee granted founder-panel access by the founder —
// same panel, same screens, gated the same way `is_co_admin()` gates RLS
// on the web. Use this everywhere instead of checking `role === 'founder'`
// alone so promoted admins actually get in.
export function hasFounderAccess(profile: Profile | null): boolean {
  return !!profile && (profile.role === 'founder' || profile.admin_level === 'co_admin');
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

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, given_name, family_name, phone, role, admin_level, account_status, avatar_key, is_verified, onboarding_complete')
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
