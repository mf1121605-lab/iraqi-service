import { audioFX } from '../../utils/audioFX';
import NotificationBell from '../UI/NotificationBell';

export const BOTTOM_NAV_HREFS = ['/customer/dashboard', '/customer/news'];

function ServiceIcon3D() {
  return (
    <svg viewBox="0 0 30 30" fill="none" className="h-8 w-8" aria-hidden="true">
      <defs>
        <linearGradient id="svc-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa"/>
          <stop offset="100%" stopColor="#2563eb"/>
        </linearGradient>
        <linearGradient id="svc-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399"/>
          <stop offset="100%" stopColor="#059669"/>
        </linearGradient>
        <linearGradient id="svc-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <linearGradient id="svc-d" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb923c"/>
          <stop offset="100%" stopColor="#ea580c"/>
        </linearGradient>
      </defs>
      {/* Top-left square — blue */}
      <rect x="3" y="3" width="11" height="11" rx="3" fill="url(#svc-a)"/>
      <rect x="4.5" y="4.5" width="4" height="2" rx="1" fill="white" opacity="0.45"/>
      {/* Top-right square — green */}
      <rect x="16" y="3" width="11" height="11" rx="3" fill="url(#svc-b)"/>
      <rect x="17.5" y="4.5" width="4" height="2" rx="1" fill="white" opacity="0.45"/>
      {/* Bottom-left square — purple */}
      <rect x="3" y="16" width="11" height="11" rx="3" fill="url(#svc-c)"/>
      <rect x="4.5" y="17.5" width="4" height="2" rx="1" fill="white" opacity="0.45"/>
      {/* Bottom-right square — orange */}
      <rect x="16" y="16" width="11" height="11" rx="3" fill="url(#svc-d)"/>
      <rect x="17.5" y="17.5" width="4" height="2" rx="1" fill="white" opacity="0.45"/>
    </svg>
  );
}

function NewsIcon3D() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7" aria-hidden="true">
      <defs>
        <linearGradient id="news-body" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#4ade80"/>
          <stop offset="55%" stopColor="#16a34a"/>
          <stop offset="100%" stopColor="#14532d"/>
        </linearGradient>
        <linearGradient id="news-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {/* Page body */}
      <rect x="4" y="3" width="20" height="22" rx="3" fill="url(#news-body)"/>
      {/* Shine */}
      <rect x="5" y="4" width="8" height="9" rx="2" fill="url(#news-shine)" opacity="0.6"/>
      {/* Header line */}
      <rect x="7" y="8" width="14" height="2.5" rx="1.25" fill="white" opacity="0.85"/>
      {/* Content lines */}
      <rect x="7" y="12.5" width="14" height="1.5" rx="0.75" fill="white" opacity="0.55"/>
      <rect x="7" y="15.5" width="10" height="1.5" rx="0.75" fill="white" opacity="0.55"/>
      <rect x="7" y="18.5" width="12" height="1.5" rx="0.75" fill="white" opacity="0.55"/>
      {/* Fold corner */}
      <path d="M20 3 L24 7 L20 7 Z" fill="#052e16" opacity="0.5"/>
    </svg>
  );
}

export default function BottomNavBar({ navItems, badges, userId, locale }) {
  if (!navItems?.length) return null;

  const isCustomerNav = navItems.some((item) => item.href === '/customer/dashboard');

  if (!isCustomerNav) {
    return (
      <nav className="fixed bottom-0 inset-x-0 z-30 sm:hidden" aria-label="التنقل الرئيسي">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden" aria-hidden="true">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-amber-500/55 to-transparent" />
        </div>
        <div className="bg-[#0d1117]/92 backdrop-blur-xl backdrop-saturate-150 shadow-[0_-4px_32px_rgba(0,0,0,0.65)]">
          <div className="flex items-end justify-around px-1 pt-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => audioFX.playNavTap()}
                  aria-label={item.label}
                  className="relative flex flex-col items-center gap-0.5 group outline-none"
                >
                  <span className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 group-active:scale-90
                    ${item.active
                      ? 'bg-gradient-to-b from-amber-500/35 to-amber-700/25 border border-amber-400/60 shadow-[0_0_22px_-4px_rgba(245,158,11,0.60),0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.22)]'
                      : 'bg-gradient-to-b from-white/10 to-white/4 border border-white/12 shadow-[0_4px_14px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.10)] group-hover:from-white/14'
                    }`}>
                    <span className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-white/25" aria-hidden="true" />
                    {Icon && <Icon className={`h-[19px] w-[19px] transition-colors ${item.active ? 'text-amber-300' : 'text-white/75 group-hover:text-white'}`} strokeWidth={item.active ? 2.2 : 1.8} aria-hidden="true" />}
                    {(badges?.[item.href] ?? 0) > 0 && (
                      <span className="absolute -top-1.5 -end-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0d1117]">
                        {(badges[item.href] ?? 0) > 9 ? '9+' : badges[item.href]}
                      </span>
                    )}
                  </span>
                  <span className={`text-[9px] font-medium leading-none tracking-tight ${item.active ? 'text-amber-400' : 'text-white/45'}`}>{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </nav>
    );
  }

  const newsItem = navItems.find((item) => item.href === '/customer/news');
  const servicesItem = navItems.find((item) => item.href === '/customer/dashboard');

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 sm:hidden" aria-label="التنقل الرئيسي">
      {/* Animated gold border — conic-gradient technique */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height: '1.5px',
          background: 'conic-gradient(from var(--border-angle,0deg), rgba(230,171,44,0.05) 0%, rgba(255,215,0,0) 45%, rgba(255,215,0,0.85) 72%, rgba(255,255,255,0.95) 78%, rgba(255,215,0,0.85) 84%, rgba(230,171,44,0.05) 100%)',
          animation: 'border-spin 4s linear infinite',
        }}
        aria-hidden="true"
      />

      {/* Bar panel with dark gradient */}
      <div
        style={{
          background: 'linear-gradient(to bottom, rgba(13,17,23,0.82) 0%, rgba(6,8,14,0.92) 50%, rgba(0,0,0,0.97) 100%)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          boxShadow: '0 -4px_32px_rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.08)',
        }}
      >
        <div
          className="flex items-end justify-around px-4"
          style={{ paddingTop: '0.6rem', paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Left — Latest News */}
          <a
            href={newsItem?.href ?? '/customer/news'}
            onClick={() => audioFX.playNavTap()}
            aria-label={newsItem?.label ?? 'آخر الأخبار'}
            className="flex flex-col items-center gap-1 group outline-none"
          >
            <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 group-active:scale-90
              ${newsItem?.active
                ? 'bg-gradient-to-b from-emerald-500/30 to-emerald-800/20 border border-emerald-400/50 shadow-[0_0_20px_-4px_rgba(52,211,153,0.6),0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)]'
                : 'bg-gradient-to-b from-white/10 to-white/4 border border-white/12 shadow-[0_4px_14px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.10)] group-hover:from-white/14'
              }`}>
              <span className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-white/25" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px rounded-full bg-black/40" aria-hidden="true" />
              <NewsIcon3D />
            </span>
            <span className={`text-[9px] font-medium leading-none tracking-tight ${newsItem?.active ? 'text-emerald-400' : 'text-white/45'}`}>
              {newsItem?.label ?? 'الأخبار'}
            </span>
          </a>

          {/* Center — Services (elevated, larger) */}
          <a
            href={servicesItem?.href ?? '/customer/dashboard'}
            onClick={() => audioFX.playNavTap()}
            aria-label={servicesItem?.label ?? 'الخدمات'}
            className="flex flex-col items-center gap-1 group outline-none -mt-5"
          >
            <span className={`relative flex h-[62px] w-[62px] items-center justify-center rounded-2xl transition-all duration-200 group-active:scale-90
              ${servicesItem?.active
                ? `bg-gradient-to-b from-amber-400/25 to-amber-700/20 border border-amber-400/55
                   shadow-[0_0_28px_-4px_rgba(245,158,11,0.7),0_6px_16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.20)]`
                : `bg-gradient-to-b from-white/12 to-white/5 border border-white/15
                   shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]
                   group-hover:from-white/16 group-hover:border-white/22`
              }`}>
              <span className="pointer-events-none absolute inset-x-3 top-0 h-px rounded-full bg-white/30" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px rounded-full bg-black/45" aria-hidden="true" />
              <ServiceIcon3D />
              {(badges?.['/customer/dashboard'] ?? 0) > 0 && (
                <span className="absolute -top-1.5 -end-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#0d1117]">
                  {(badges['/customer/dashboard'] ?? 0) > 9 ? '9+' : badges['/customer/dashboard']}
                </span>
              )}
            </span>
            <span className={`text-[9px] font-medium leading-none tracking-tight ${servicesItem?.active ? 'text-amber-400' : 'text-white/45'}`}>
              {servicesItem?.label ?? 'الخدمات'}
            </span>
          </a>

          {/* Right — Notifications Bell */}
          <div className="flex flex-col items-center gap-1">
            {userId ? (
              <NotificationBell userId={userId} locale={locale} dropUp navVariant channelSuffix="bar" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-white/10 to-white/4 border border-white/12 shadow-[0_4px_14px_rgba(0,0,0,0.5)]">
                <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7" aria-hidden="true">
                  <path d="M14 4C14 4 12 4 10.5 5.5C9 7 8.5 9 8.5 11.5L7 19H21L19.5 11.5C19.5 9 19 7 17.5 5.5C16 4 14 4 14 4Z" fill="#92400e"/>
                </svg>
              </span>
            )}
            <span className="text-[9px] font-medium leading-none tracking-tight text-white/45">الإشعارات</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
