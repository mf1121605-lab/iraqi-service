import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseClient } from '../lib/supabaseClient';

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabaseClient.auth.getSession().then(({ data: { session: s } }) => {
      if (!active) return;
      setSession(s);
      if (!s) {
        setLoading(false);
        return;
      }
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .single()
        .then(({ data: p }) => {
          if (!active) return;
          setProfile(p);
          setLoading(false);
        });
    });

    const { data: authListener } = supabaseClient.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setProfile(null);
        setLoading(false);
        return;
      }
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .single()
        .then(({ data: p }) => {
          if (active) {
            setProfile(p);
            setLoading(false);
          }
        });
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabaseClient.auth.signOut();
  }

  return { session, profile, loading, signOut };
}

export function useRequireRole(roles) {
  const { session, profile, loading, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/');
      return;
    }
    if (profile && !roles.includes(profile.role)) {
      router.replace(dashboardPathForRole(profile.role));
    }
  }, [loading, session, profile, roles, router]);

  return { session, profile, loading, signOut };
}

export function dashboardPathForRole(role) {
  if (role === 'founder' || role === 'employee') return '/employee/dashboard';
  return '/customer/dashboard';
}
