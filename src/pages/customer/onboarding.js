import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Sparkles } from 'lucide-react';
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero p-6 text-white">
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 animate-float rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-16 h-72 w-72 animate-float rounded-full bg-gold-400/20 blur-3xl [animation-delay:1.5s]" />

      <div className="glass-panel relative w-full max-w-lg animate-scale-in rounded-4xl p-10 text-center shadow-elevate-lg">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 shadow-inner-glass">
          <Sparkles className="h-7 w-7" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">{t('onboarding.title')}</h1>
        <p className="mt-2 text-white/80">{t('onboarding.subtitle')}</p>

        <div className="mt-8">
          <AvatarPicker value={selected} onSelect={setSelected} />
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          className="mt-8 w-full rounded-xl2 bg-gradient-gold px-4 py-3 font-bold text-brand-950 shadow-glow transition-all duration-300 hover:scale-[1.01] hover:opacity-90 disabled:opacity-50 disabled:hover:scale-100"
        >
          {t('onboarding.continueCta')}
        </button>
      </div>
    </main>
  );
}
