import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles } from 'lucide-react';
import AvatarPicker from '../../components/UI/AvatarPicker';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import { useLocale } from '../../components/Layout/AppShell';

export default function CustomerOnboarding() {
  const { profile, loading } = useRequireRole(['customer']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [selected, setSelected] = useState(null);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill name + avatar if already set (returning user editing)
  useEffect(() => {
    if (profile?.given_name) setGivenName(profile.given_name);
    if (profile?.family_name) setFamilyName(profile.family_name);
    if (profile?.avatar_key) setSelected(profile.avatar_key);
  }, [profile]);

  // If already completed onboarding, go straight to dashboard
  useEffect(() => {
    if (!loading && profile?.onboarding_complete) {
      router.replace('/customer/dashboard');
    }
  }, [loading, profile, router]);

  // Show name fields only if given_name is not yet set (e.g. Google/Facebook OAuth users)
  const needsName = !profile?.given_name;

  const canContinue = selected && (!needsName || givenName.trim());

  async function handleContinue() {
    setError('');

    if (!selected) {
      setError(t('onboarding.errorSelectAvatar'));
      return;
    }
    if (needsName && !givenName.trim()) {
      setError(t('onboarding.errorEnterName'));
      return;
    }

    setSaving(true);

    const updates = {
      avatar_key: selected,
      onboarding_complete: true,
    };
    if (needsName) {
      if (givenName.trim()) updates.given_name = givenName.trim();
      if (familyName.trim()) updates.family_name = familyName.trim();
    }

    const { error: saveError } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    setSaving(false);
    if (saveError) {
      setError(saveError.message || t('common.errorGeneric'));
      return;
    }
    router.replace('/customer/dashboard');
  }

  if (loading || !profile || profile.onboarding_complete) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 animate-spotlight-sweep rounded-full bg-gold-400/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 animate-float rounded-full bg-white/5 blur-xl [will-change:transform]" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-72 w-72 animate-float rounded-full bg-gold-400/15 blur-xl [will-change:transform] [animation-delay:1.5s]" />

      <div className="cinematic-card relative z-10 w-full max-w-lg animate-scale-in overflow-y-auto p-8 text-center" style={{ maxHeight: '95vh' }}>
        <span className="cinematic-emblem mx-auto h-16 w-16">
          <Sparkles className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{t('onboarding.title')}</h1>
        <p className="mt-2 text-white/70">{t('onboarding.subtitle')}</p>

        {/* Name entry — only if not already collected during registration */}
        {needsName && (
          <div className="mt-6 space-y-3 text-start">
            <h2 className="mb-3 text-center text-sm font-semibold text-gold-300">{t('onboarding.nameStepTitle')}</h2>
            <input
              type="text"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder={t('onboarding.givenNamePlaceholder')}
              className="input-cinematic w-full"
              dir="rtl"
              autoComplete="given-name"
            />
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder={t('onboarding.familyNamePlaceholder')}
              className="input-cinematic w-full"
              dir="rtl"
              autoComplete="family-name"
            />
          </div>
        )}

        {/* Avatar picker */}
        <div className="mt-6">
          <h2 className="mb-4 text-sm font-semibold text-gold-300">{t('onboarding.avatarStepTitle')}</h2>
          <AvatarPicker value={selected} onSelect={setSelected} profileId={profile.id} />
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving || !canContinue}
          className="btn-cinematic-gold mt-6 w-full px-4 py-3.5 disabled:opacity-50"
        >
          {saving ? '...' : t('onboarding.continueCta')}
        </button>

        {!selected && (
          <p className="mt-2 text-xs text-amber-400/80">{t('onboarding.mustSelectAvatar')}</p>
        )}
      </div>
    </main>
  );
}
