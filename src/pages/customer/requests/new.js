import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CircleCheck as CheckCircle2, File as FileEdit, Newspaper } from 'lucide-react';
import AppShell, { useLocale } from '../../../components/Layout/AppShell';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { supabaseClient } from '../../../lib/supabaseClient';
import { useRequireRole } from '../../../utils/useSession';
import { translate } from '../../../utils/i18n';
import { categoryLabel, useCategories } from '../../../utils/useCategories';

const TITLE_FROM_DETAILS_MAX_LENGTH = 80;

function bilingualText(row, base, locale) {
  return (locale === 'ckb' ? row[`${base}_ckb`] : row[`${base}_ar`]) || row[`${base}_ar`] || '';
}

export default function NewRequest() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const router = useRouter();
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const categories = useCategories();

  const selectedCategory = categories?.find((category) => category.key === router.query.category);
  const category = selectedCategory?.key ?? router.query.category ?? 'general';

  const [services, setServices] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newsItems, setNewsItems] = useState([]);

  useEffect(() => {
    if (!category) return;
    supabaseClient
      .from('category_services')
      .select('id, label_ar, label_ckb')
      .eq('category_key', category)
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setServices(data ?? []));
  }, [category]);

  // Any founder-published announcement assigned to this same category
  // shows here too, above the request form — the founder assigns a
  // category to an announcement from /hq/news-links so it's actually
  // relevant to citizens starting a request in that category.
  useEffect(() => {
    if (!category) return;
    supabaseClient
      .from('news_links')
      .select('id, title_ar, title_ckb, deadline, requirements_ar, requirements_ckb, required_documents')
      .eq('category', category)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNewsItems(data ?? []));
  }, [category]);

  const selectedService = services?.find((service) => service.id === selectedServiceId);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const trimmedDetails = details.trim();
    if (!selectedService && !trimmedDetails) {
      setError(t('requestForm.errorPickOrType'));
      return;
    }

    const title = selectedService
      ? locale === 'ckb'
        ? selectedService.label_ckb
        : selectedService.label_ar
      : trimmedDetails.slice(0, TITLE_FROM_DETAILS_MAX_LENGTH);

    setSubmitting(true);
    const { data, error: insertError } = await supabaseClient
      .from('requests')
      .insert({
        customer_id: profile.id,
        category,
        title,
        description: trimmedDetails || null,
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (insertError) {
      setError(t('common.errorGeneric'));
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push(`/customer/requests/${data.id}/matching`), 1200);
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  return (
    <AppShell onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      {newsItems.length > 0 && (
        <div className="mx-auto mb-4 max-w-xl animate-slide-up rounded-2xl border border-gold-400/20 bg-gold-400/5 p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gold-700 dark:text-gold-300">
            <Newspaper className="h-4 w-4" aria-hidden="true" />
            {t('requestForm.relatedNewsTitle')}
          </h3>
          <ul className="mt-2 space-y-3">
            {newsItems.map((item) => (
              <li key={item.id} className="border-b border-gold-400/10 pb-2 last:border-0 last:pb-0">
                <p className="text-sm font-semibold">{bilingualText(item, 'title', locale)}</p>
                {item.deadline && (
                  <p className="mt-0.5 text-xs text-ink-muted dark:text-ink-dark-muted">
                    {t('customerHub.newsDeadlineLabel')}: {item.deadline}
                  </p>
                )}
                {bilingualText(item, 'requirements', locale) && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted dark:text-ink-dark-muted">
                    {t('customerHub.newsRequirementsLabel')}: {bilingualText(item, 'requirements', locale)}
                  </p>
                )}
                {item.required_documents && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted dark:text-ink-dark-muted">
                    {t('customerHub.newsRequiredDocumentsLabel')}: {item.required_documents}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
            {services === null ? (
              <LoadingSpinner inline locale={locale} />
            ) : services.length > 0 ? (
              <div>
                <p className="mb-2 block text-sm">{t('requestForm.servicesListLabel')}</p>
                <div className="flex flex-wrap gap-2">
                  {services.map((service) => {
                    const label = locale === 'ckb' ? service.label_ckb : service.label_ar;
                    const active = selectedServiceId === service.id;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setSelectedServiceId(active ? null : service.id)}
                        className={`rounded-xl2 border px-3.5 py-2 text-sm font-semibold transition-all duration-200 ${
                          active
                            ? 'border-brand-500 bg-brand-600 text-white shadow-glass-sm'
                            : 'border-black/10 bg-white text-ink-light hover:border-brand-400/50 dark:border-white/10 dark:bg-surface-dark dark:text-ink-dark'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-ink-muted dark:text-ink-dark-muted">{t('requestForm.servicesListHint')}</p>
              </div>
            ) : null}

            <div>
              <label htmlFor="details" className="mb-1 block text-sm">
                {t('requestForm.descriptionLabel')}
              </label>
              <textarea
                id="details"
                rows={5}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={
                  selectedService ? t('requestForm.descriptionPlaceholder') : t('requestForm.descriptionPlaceholderNoService')
                }
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
