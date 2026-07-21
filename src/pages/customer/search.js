import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, GraduationCap, LayoutGrid, Package, Search, Tag, X } from 'lucide-react';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import LoadingSpinner from '../../components/LoadingSpinner';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';
import StatusBadge from '../../components/UI/StatusBadge';

const TYPE_ICONS = {
  category: Tag,
  product: Package,
  request: ClipboardList,
};

function ResultItem({ item, locale, t }) {
  const Icon = TYPE_ICONS[item.result_type] ?? Tag;
  const title = locale === 'ckb' ? item.title_ckb || item.title_ar : item.title_ar;
  const subtitle = item.result_type === 'request'
    ? null
    : locale === 'ckb' ? item.subtitle_ckb || item.subtitle_ar : item.subtitle_ar;

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-xl2 border border-black/5 bg-white/60 p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevate dark:border-white/10 dark:bg-surface-dark-alt/60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{title}</p>
        {subtitle && <p className="truncate text-xs text-ink-muted dark:text-ink-dark-muted">{subtitle}</p>}
        {item.result_type === 'request' && (
          <StatusBadge status={item.subtitle_ar} locale={locale} />
        )}
      </div>
      <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-ink-muted dark:bg-white/10 dark:text-ink-dark-muted">
        {t(`search.type_${item.result_type}`)}
      </span>
    </Link>
  );
}

export default function CustomerSearch() {
  const { profile, loading, signOut, refreshProfile } = useRequireRole(['customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      return;
    }
    if (trimmed.length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabaseClient.rpc('search_content', { p_query: trimmed });
      setResults(data ?? []);
      setSearching(false);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-hero text-white">
        <LoadingSpinner locale={locale} />
      </main>
    );
  }

  const navItems = [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), icon: LayoutGrid },
    { href: '/customer/search', label: t('search.navLabel'), active: true, icon: Search },
    { href: '/customer/requests', label: t('customerHub.myRequestsCta'), icon: ClipboardList },
    { href: '/customer/tutor', label: t('aiTutor.navCta'), icon: GraduationCap },
  ];

  const grouped = results
    ? {
        category: results.filter((r) => r.result_type === 'category'),
        request: results.filter((r) => r.result_type === 'request'),
      }
    : null;

  return (
    <AppShell navItems={navItems} onSignOut={signOut} userId={profile.id} profile={profile} onProfileUpdated={refreshProfile}>
      <div className="mx-auto max-w-2xl">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <Search className="h-5 w-5" aria-hidden="true" />
          {t('search.title')}
        </h2>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full rounded-2xl border border-black/10 bg-white py-3.5 pe-10 ps-11 text-sm shadow-soft transition-all focus:outline-none focus:ring-2 focus:ring-brand-400 dark:border-white/10 dark:bg-surface-dark"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
              aria-label={t('common.cancel')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink-light dark:text-ink-dark-muted"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {searching && <LoadingSpinner inline locale={locale} className="mt-6" />}

        {!searching && results !== null && results.length === 0 && (
          <p className="mt-8 text-center text-sm text-ink-muted dark:text-ink-dark-muted">{t('common.noResults')}</p>
        )}

        {!searching && grouped && (
          <div className="mt-5 space-y-6">
            {grouped.category.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">{t('search.type_category')}</p>
                <div className="space-y-2">
                  {grouped.category.map((item) => <ResultItem key={item.id} item={item} locale={locale} t={t} />)}
                </div>
              </section>
            )}
            {grouped.request.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">{t('search.type_request')}</p>
                <div className="space-y-2">
                  {grouped.request.map((item) => <ResultItem key={item.id} item={item} locale={locale} t={t} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {!query && (
          <p className="mt-10 text-center text-sm text-ink-muted dark:text-ink-dark-muted">{t('search.hint')}</p>
        )}
      </div>
    </AppShell>
  );
}
