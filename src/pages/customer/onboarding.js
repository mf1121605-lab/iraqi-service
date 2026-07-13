import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AvatarPicker from '../../components/UI/AvatarPicker';
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
  const [saving, setSaving] = useState(false);

  // Returning customers who already picked an avatar skip straight past
  // this one-time onboarding step.
  useEffect(() => {
    if (!loading && profile?.avatar_key) {
      router.replace('/customer/dashboard');
    }
  }, [loading, profile, router]);

  async function handleContinue() {
    if (!selected) {
      router.replace('/customer/dashboard');
      return;
    }
    setSaving(true);
    await supabaseClient.from('profiles').update({ avatar_key: selected }).eq('id', profile.id);
    setSaving(false);
    router.replace('/customer/dashboard');
  }

  if (loading || !profile || profile.avatar_key) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-hero p-6 text-white">
      <div className="glass-panel w-full max-w-lg animate-fade-in rounded-3xl p-10 text-center shadow-glass">
        <h1 className="font-display text-2xl font-bold">{t('onboarding.title')}</h1>
        <p className="mt-2 text-white/80">{t('onboarding.subtitle')}</p>

        <div className="mt-8">
          <AvatarPicker value={selected} onSelect={setSelected} />
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="mt-8 w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 transition hover:opacity-90 disabled:opacity-50"
        >
          {t('onboarding.continueCta')}
        </button>
      </div>
    </main>
  );
}
