import { BarChart3, LayoutDashboard, MessageCircle, ScrollText, Tags, Users } from 'lucide-react';
import { translate } from './i18n';

export function useFounderNav(locale, active) {
  const t = (path) => translate(locale, path);
  return [
    { href: '/founder/dashboard', label: t('founderPanel.navDashboard'), active: active === 'dashboard', icon: LayoutDashboard },
    { href: '/founder/categories', label: t('founderCategories.title'), active: active === 'categories', icon: Tags },
    { href: '/founder/users', label: t('founderPanel.navUsers'), active: active === 'users', icon: Users },
    { href: '/founder/stats', label: t('founderPanel.navStats'), active: active === 'stats', icon: BarChart3 },
    { href: '/founder/audit-log', label: t('founderPanel.navAuditLog'), active: active === 'audit-log', icon: ScrollText },
    { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
  ];
}
