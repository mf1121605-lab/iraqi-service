import { useEffect, useState } from 'react';
import { Globe, LogOut, Menu, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import {
  LOCALE_META,
  defaultLocale,
  getDirection,
  setStoredLocale,
  translate,
  useSyncedLocale,
} from '../../utils/i18n';
import { supabaseClient } from '../../lib/supabaseClient';
import { toggleAmbientAudio, useAmbientAudioPlaying } from '../../utils/ambientAudio';
import { useSiteSettings } from '../../utils/useSiteSettings';
import NotificationBell from '../UI/NotificationBell';

const THEME_KEY = 'iraqi-services:theme';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export default function AppShell({ title, navItems, onSignOut, userId, children }) {
  const locale = useSyncedLocale();
  const [theme, setTheme] = useState('light');
  const [mobileOpen, setMobileOpen] = useState(false);
  const siteSettings = useSiteSettings();
  const ambientPlaying = useAmbientAudioPlaying();

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    document.documentElement.dir = getDirection(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
  }, [navItems]);

  // Powers the founder's online/offline presence badge — a light
  // periodic ping while this authenticated page is open, not a full
  // real-time channel.
  useEffect(() => {
    if (!userId) return undefined;

    async function ping() {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session?.access_token) return;
      fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  function toggleLocale() {
    const next = LOCALE_META.find((meta) => meta.code !== locale)?.code ?? defaultLocale;
    setStoredLocale(next);
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, next);
  }

  const t = (path) => translate(locale, path);

  const NavLinks = ({ onNavigate }) => (
    <>
      {(navItems ?? []).map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10 ${
              item.active
                ? 'bg-brand-600/10 font-semibold text-brand-700 shadow-inner-glass dark:bg-brand-400/10 dark:text-brand-300'
                : 'text-ink-light/80 dark:text-ink-dark/80'
            }`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
            {item.label}
          </a>
        );
      })}
    </>
  );

  return (
    <div className="min-h-dvh bg-surface-patterned text-ink-light dark:dark-surface-patterned dark:text-ink-dark">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <header className="sticky top-0 z-30 glass-nav relative border-b border-black/5 shadow-soft transition-colors dark:glass-nav-dark dark:border-gold-400/10">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent dark:block" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-glow dark:bg-none dark:bg-gold-400/15 dark:text-gold-300 dark:shadow-[0_0_0_1px_rgba(230,171,44,0.35),0_4px_16px_-4px_rgba(230,171,44,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-icon-512.png" alt="" className="h-full w-full rounded-xl object-contain p-1" />
            </span>
            <h1 className="font-display text-lg font-bold tracking-tight">{title ?? t('common.platformName')}</h1>
          </div>

          {navItems && navItems.length > 0 && (
            <nav className="hidden flex-wrap items-center gap-1 sm:flex">
              <NavLinks />
            </nav>
          )}

          <div className="flex items-center gap-1.5 text-sm">
            {userId && <NotificationBell userId={userId} locale={locale} />}
            {siteSettings?.site_ambient_audio_url && (
              <button
                type="button"
                onClick={toggleAmbientAudio}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10"
                aria-label={ambientPlaying ? t('common.muteSiteAudio') : t('common.unmuteSiteAudio')}
                aria-pressed={ambientPlaying}
              >
                {ambientPlaying ? (
                  <Volume2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={toggleLocale}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-medium transition-colors duration-200 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10"
              aria-label={t('gateway.switchLanguage')}
            >
              <Globe className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">
                {LOCALE_META.find((meta) => meta.code !== locale)?.nativeName}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10"
              aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            >
              <span className="relative block h-4 w-4">
                <Sun
                  className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
                    theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <Moon
                  className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${
                    theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                  }`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 font-semibold text-white shadow-glass-sm transition-all duration-200 hover:bg-brand-700 hover:shadow-elevate focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                <span className="hidden sm:inline">{t('common.signOut')}</span>
              </button>
            )}
            {navItems && navItems.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-brand-400 dark:hover:bg-white/10 sm:hidden"
                aria-label={t('common.menu')}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>

        {navItems && navItems.length > 0 && mobileOpen && (
          <nav className="glass-nav animate-slide-down border-t border-black/5 px-4 py-3 dark:glass-nav-dark dark:border-white/5 sm:hidden">
            <div className="flex flex-col gap-1">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
          </nav>
        )}
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export const useLocale = useSyncedLocale;
