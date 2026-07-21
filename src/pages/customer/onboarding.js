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
  const [saving, setSaving] = useState(false);

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

      <div className="cinematic-card relative z-10 w-full max-w-lg animate-scale-in p-10 text-center">
        <span className="cinematic-emblem mx-auto h-16 w-16">
          <Sparkles className="h-7 w-7 text-gold-300" strokeWidth={2} aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight">{t('onboarding.title')}</h1>
        <p className="mt-2 text-white/70">{t('onboarding.subtitle')}</p>

        <div className="mt-8">
          <AvatarPicker value={selected} onSelect={setSelected} />
        </div>

        <button type="button" onClick={handleContinue} disabled={saving} className="btn-cinematic-gold mt-8 w-full px-4 py-3.5 disabled:opacity-50">
          {t('onboarding.continueCta')}
        </button>
      </div>
    </main>
  );
}
