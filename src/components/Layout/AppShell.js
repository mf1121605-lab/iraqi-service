import { useEffect, useState } from 'react';
import { Globe, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
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
import { useNavBadges } from '../../utils/useNavBadges';
import NotificationBell from '../UI/NotificationBell';
import RequestAlertBell from '../UI/RequestAlertBell';
import BottomNavBar from './BottomNavBar';
import Avatar from '../Chat/Avatar';
import ProfileDrawer from '../UI/ProfileDrawer';

const THEME_KEY = 'iraqi-services:theme';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

// Fixed positions (not Math.random()) so server/client markup matches on
// hydration — a small twinkling "night sky" layer behind the header,
// dark mode only, echoing the founder's cinematic-gold night identity.
const HEADER_STARS = [
  { top: '22%', left: '6%', size: 2, delay: '0s' },
  { top: '58%', left: '16%', size: 1.5, delay: '0.7s' },
  { top: '32%', left: '30%', size: 2, delay: '1.4s' },
  { top: '68%', left: '42%', size: 1.5, delay: '0.3s' },
  { top: '18%', left: '56%', size: 2, delay: '1s' },
  { top: '52%', left: '67%', size: 1.5, delay: '1.7s' },
  { top: '28%', left: '79%', size: 2, delay: '0.5s' },
  { top: '62%', left: '91%', size: 1.5, delay: '1.2s' },
];

function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

export default function AppShell({ title, navItems, onSignOut, userId, profile, onProfileUpdated, children }) {
  const locale = useSyncedLocale();
  const [theme, setTheme] = useState('light');
  const [profileOpen, setProfileOpen] = useState(false);
  const siteSettings = useSiteSettings();
  const ambientPlaying = useAmbientAudioPlaying();
  const { requestsBadge } = useNavBadges(userId, profile?.role);

  const badges = {
    '/customer/requests': requestsBadge,
  };

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
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
              item.active
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-400 border border-amber-500/35 shadow-[0_0_14px_-4px_rgba(245,158,11,0.30)] dark:from-amber-500/20 dark:to-amber-600/10'
                : 'bg-black/5 text-ink-light/80 hover:bg-black/8 dark:bg-white/5 dark:text-ink-dark/70 dark:hover:bg-white/8 dark:hover:text-white'
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
    <div className="min-h-dvh text-ink-light dark:text-ink-dark">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      {/* HEADER — glassmorphism navbar with amber border in dark mode */}
      <header className="sticky top-0 z-30 relative overflow-hidden glass-nav dark:glass-nav-dark transition-all duration-300 shadow-soft dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.7),0_0_0_1px_rgba(245,158,11,0.08)]">
        {/* Night-sky twinkling backdrop — dark mode only */}
        <div className="pointer-events-none absolute inset-0 hidden dark:block" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-[#090c12]/95 via-[#0d1117]/60 to-transparent" />
          {HEADER_STARS.map((star, index) => (
            <span
              key={index}
              className="absolute animate-pulse-soft rounded-full bg-white"
              style={{ top: star.top, left: star.left, width: star.size, height: star.size, animationDelay: star.delay }}
            />
          ))}
          {/* Ambient amber glow orb */}
          <div className="absolute -right-8 top-1/2 h-32 w-32 -translate-y-1/2 animate-pulse-soft rounded-full bg-amber-500/8 blur-3xl" style={{ animationDelay: '0.4s' }} />
          <div className="absolute -left-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-amber-600/5 blur-2xl" />
        </div>
        {/* Shimmer bottom border line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div className="h-full w-full animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent dark:via-amber-400/70" />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          {/* LOGO + TITLE */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inset-0 -z-10 animate-pulse-soft rounded-xl bg-amber-500/20 blur-md dark:bg-amber-400/15" aria-hidden="true" />
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-white shadow-glow dark:bg-none dark:bg-amber-500/12 dark:ring-1 dark:ring-amber-500/30 dark:shadow-[0_0_14px_-4px_rgba(245,158,11,0.45)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-icon-512.png" alt="" className="h-full w-full rounded-xl object-contain p-1" />
              </span>
            </span>
            <h1 className="font-display text-lg font-bold tracking-tight text-ink-light dark:text-white">{title ?? t('common.platformName')}</h1>
          </div>

          {/* DESKTOP NAV PILLS */}
          {navItems && navItems.length > 0 && (
            <nav className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <NavLinks />
            </nav>
          )}

          {/* RIGHT SIDE: actions — each button gets a subtle 3D depth effect */}
          <div className="flex items-center gap-1 text-sm">
            {profile && (
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                aria-label={t('profileDrawer.title')}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-90
                  bg-gradient-to-b from-white/8 to-white/3 border border-white/10
                  shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.10)]
                  hover:from-white/12 hover:border-white/18
                  focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <Avatar avatarKey={profile.avatar_key} name={profile.given_name} seed={profile.id} className="h-8 w-8 ring-2 ring-transparent dark:ring-amber-500/20" />
                <span className="absolute bottom-0.5 h-2.5 w-2.5 rtl:left-0.5 ltr:right-0.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" aria-hidden="true" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0d1117]" aria-hidden="true" />
                </span>
              </button>
            )}
            <RequestAlertBell profile={profile} locale={locale} />
            {userId && <NotificationBell userId={userId} locale={locale} />}
            {siteSettings?.site_ambient_audio_url && (
              <button
                type="button"
                onClick={toggleAmbientAudio}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-90
                  bg-gradient-to-b from-white/8 to-white/3 border border-white/10
                  shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.10)]
                  hover:from-white/12 hover:border-white/18
                  focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                aria-label={ambientPlaying ? t('common.muteSiteAudio') : t('common.unmuteSiteAudio')}
                aria-pressed={ambientPlaying}
              >
                {ambientPlaying ? (
                  <Volume2 className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" strokeWidth={2} aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" strokeWidth={2} aria-hidden="true" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={toggleLocale}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-95
                bg-gradient-to-b from-white/8 to-white/3 border border-white/10
                shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:from-white/12 hover:border-white/18
                focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              aria-label={t('gateway.switchLanguage')}
            >
              <Globe className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">
                {LOCALE_META.find((meta) => meta.code !== locale)?.nativeName}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-90
                bg-gradient-to-b from-white/8 to-white/3 border border-white/10
                shadow-[0_4px_10px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.10)]
                hover:from-white/12 hover:border-white/18
                focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              aria-label={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            >
              <span className="relative block h-4 w-4">
                <Sun
                  className={`absolute inset-0 h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                    theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <Moon
                  className={`absolute inset-0 h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                    theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                  }`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </span>
            </button>
          </div>
        </div>
      </header>
      {/* Extra bottom padding on mobile so content clears the fixed bottom nav */}
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:pb-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">{children}</main>
      <BottomNavBar navItems={navItems} badges={badges} />
      {profile && (
        <ProfileDrawer
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          profile={profile}
          locale={locale}
          onProfileUpdated={onProfileUpdated}
          theme={theme}
          onToggleTheme={toggleTheme}
          onToggleLocale={toggleLocale}
          onSignOut={onSignOut}
        />
      )}
    </div>
  );
}

export const useLocale = useSyncedLocale;
