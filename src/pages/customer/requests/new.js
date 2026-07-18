import { useState } from 'react';
import { useRouter } from 'next/router';
import { CircleCheck as CheckCircle2, File as FileEdit } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';
import { categoryLabel, useCategories } from '../../../utils/useCategories';

export default function NewRequest() {
  const { profile, loading, signOut } = useRequireRole(['customer']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const categories = useCategories();

  const selectedCategory = categories?.find((category) => category.key === router.query.category);
  const category = selectedCategory?.key ?? router.query.category ?? 'general';
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: insertError } = await supabaseClient.from('requests').insert({
      customer_id: profile.id,
      category,
      title,
      description,
    });
    setSubmitting(false);
    if (insertError) {
      setError(t('common.errorGeneric'));
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/customer/requests'), 1500);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id}>
      <div className="mx-auto max-w-xl animate-slide-up rounded-3xl border border-black/5 bg-white/60 p-8 shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300">
            <FileEdit className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-xl font-bold">{t('requestForm.title')}</h2>
            <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
              {selectedCategory ? categoryLabel(selectedCategory, locale) : category}
            </p>
          </div>
        </div>

        {success ? (
          <div className="mt-6 flex animate-scale-in items-center gap-3 rounded-2xl bg-brand-500/10 p-4 text-brand-700 dark:text-brand-300">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{t('requestForm.successMessage')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="title" className="mb-1 block text-sm">
                {t('requestForm.titleLabel')}
              </label>
              <input
                id="title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('requestForm.titlePlaceholder')}
                className="w-full rounded-xl2 border border-black/10 bg-white px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
              />
            </div>
            <div>
              <label htmlFor="description" className="mb-1 block text-sm">
                {t('requestForm.descriptionLabel')}
              </label>
              <textarea
                id="description"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('requestForm.descriptionPlaceholder')}
                className="w-full rounded-xl2 border border-black/10 bg-white px-4 py-3 transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
              />
            </div>
            {error && <p className="animate-slide-down text-sm text-red-600 dark:text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl2 bg-brand-600 px-4 py-3 font-bold text-white shadow-glass-sm transition-all duration-300 hover:bg-brand-700 hover:shadow-elevate disabled:opacity-50"
            >
              {t('requestForm.submitCta')}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
