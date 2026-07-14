import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseClient } from '../lib/supabaseClient';

export function dashboardPathForRole(role) {
  if (role === 'founder') return '/founder/dashboard';
  if (role === 'employee') return '/employee/dashboard';
  return '/customer/dashboard';
}

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadProfile(data.session?.user?.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    const { data: subscription } = supabaseClient.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabaseClient.auth.signOut();
  }, []);

  return { session, profile, loading, signOut, refreshProfile: () => loadProfile(session?.user?.id) };
}

export function useRequireRole(allowedRoles) {
  const router = useRouter();
  const { session, profile, loading, signOut, refreshProfile } = useSession();

  const allowedRolesKey = allowedRoles.join(',');

  useEffect(() => {
    if (loading) return;
    if (!session || !profile) {
      router.replace('/');
      return;
    }
    if (!allowedRolesKey.split(',').includes(profile.role)) {
      router.replace(dashboardPathForRole(profile.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, profile, allowedRolesKey, router]);

  return { session, profile, loading, signOut, refreshProfile };
}
