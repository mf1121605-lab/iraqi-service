import { translate } from './i18n';

export function useFounderNav(locale, active) {
  const t = (path) => translate(locale, path);
  return [
    { href: '/founder/dashboard', label: t('founderPanel.navDashboard'), active: active === 'dashboard' },
    { href: '/founder/users', label: t('founderPanel.navUsers'), active: active === 'users' },
    { href: '/founder/stats', label: t('founderPanel.navStats'), active: active === 'stats' },
    { href: '/founder/audit-log', label: t('founderPanel.navAuditLog'), active: active === 'audit-log' },
    { href: '/chat', label: t('chat.roomsTitle') },
  ];
}
