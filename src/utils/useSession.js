import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabaseClient } from '../lib/supabaseClient';

export function dashboardPathForRole(roleOrProfile) {
  const role = typeof roleOrProfile === 'string' ? roleOrProfile : roleOrProfile?.role;
  const adminLevel = typeof roleOrProfile === 'string' ? null : roleOrProfile?.admin_level;
  if (role === 'founder' || adminLevel === 'co_admin') return '/founder/dashboard';
  if (role === 'employee') return '/employee/dashboard';
  return '/customer/dashboard';
}

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId, attempt = 0) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    // Explicit column list (not '*') — recovery_answer_hash is
    // intentionally excluded from the authenticated role's SELECT grant
    // (see 20260718140000_restrict_recovery_hash_select.sql), so a
    // wildcard select would fail with "permission denied for column".
    const { data } = await supabaseClient
      .from('profiles')
      .select(
        'id, role, admin_level, account_status, phone, phone_verified, email, given_name, father_name, grandfather_name, family_name, avatar_key, specialization, active_services, created_at, updated_at, pinned_room_ids, username, recovery_question_id'
      )
      .eq('id', userId)
      .single();
    if (!data && attempt < 5) {
      // A profile row is created by a DB trigger right after signup (e.g. a
      // fresh Google OAuth account); it can lag a moment behind the redirect
      // back to the app, so retry briefly instead of treating it as "signed out".
      await new Promise((resolve) => setTimeout(resolve, 400));
      return loadProfile(userId, attempt + 1);
    }
    // Derive onboarding_complete from existing columns so the app works
    // even before the migration that adds the real DB column is applied.
    const profile = data ? {
      ...data,
      onboarding_complete:
        data.role !== 'customer' ||
        (!!data.avatar_key && !!data.given_name && data.given_name !== ''),
    } : null;
    setProfile(profile);
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
    // Suspended accounts are immediately signed out regardless of role.
    if (profile.account_status === 'suspended') {
      signOut().then(() => router.replace('/'));
      return;
    }
    // co_admin is an admin_level on an employee profile, not a separate role value.
    // Build the effective role set so pages can gate on 'co_admin' explicitly.
    const effectiveRoles = [profile.role];
    if (profile.admin_level === 'co_admin') effectiveRoles.push('co_admin');
    if (!allowedRolesKey.split(',').some((r) => effectiveRoles.includes(r))) {
      router.replace(dashboardPathForRole(profile));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, profile, allowedRolesKey, router]);

  return { session, profile, loading, signOut, refreshProfile };
}
