import { useEffect, useState } from 'react';
import {
  LOCALE_META,
  defaultLocale,
  getDirection,
  getStoredLocale,
  setStoredLocale,
  translate,
} from '../../utils/i18n';
import NotificationBell from '../UI/NotificationBell';

const THEME_KEY = 'iraqi-services:theme';

function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export default function AppShell({ title, navItems, onSignOut, userId, children }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const storedLocale = getStoredLocale();
    if (storedLocale) setLocale(storedLocale);
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  function toggleLocale() {
    const next = LOCALE_META.find((meta) => meta.code !== locale)?.code ?? defaultLocale;
    setLocale(next);
    setStoredLocale(next);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, next);
  }

  const t = (path) => translate(locale, path);

  return (
    <div className="min-h-screen bg-surface-light text-ink-light dark:bg-surface-dark dark:text-ink-dark">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white/70 px-6 py-4 backdrop-blur dark:border-white/5 dark:bg-surface-dark-alt/70">
        <h1 className="font-display text-lg font-bold">{title ?? t('common.platformName')}</h1>

        {navItems && navItems.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 ${
                  item.active ? 'bg-brand-600/10 font-semibold text-brand-700 dark:text-brand-300' : ''
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 text-sm">
          {userId && <NotificationBell userId={userId} locale={locale} />}
          <button
            type="button"
            onClick={toggleLocale}
            className="rounded-lg px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {LOCALE_META.find((meta) => meta.code !== locale)?.nativeName}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
          </button>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
            >
              {t('common.signOut')}
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function useLocale() {
  const [locale, setLocale] = useState(defaultLocale);
  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) setLocale(stored);
  }, []);
  return locale;
}
