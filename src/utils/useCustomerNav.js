import { ClipboardList, GraduationCap, LayoutGrid, MessageCircle, Newspaper, Search } from 'lucide-react';
import { translate } from './i18n';

// Single source of truth for the 6-item customer navigation.
// Used by CustomerShell in _app.js to keep nav consistent across all customer pages.
export function getCustomerNavItems(locale, activePath) {
  const t = (key) => translate(locale, key);
  return [
    { href: '/customer/dashboard', label: t('customerHub.categoriesTitle'), active: activePath === '/customer/dashboard', icon: LayoutGrid },
    { href: '/customer/search',    label: t('search.navLabel'),              active: activePath === '/customer/search',    icon: Search },
    { href: '/customer/requests',  label: t('customerHub.myRequestsCta'),    active: activePath != null && activePath.startsWith('/customer/requests'), icon: ClipboardList },
    { href: '/customer/tutor',     label: t('aiTutor.navCta'),               active: activePath != null && activePath.startsWith('/customer/tutor'), icon: GraduationCap },
    { href: '/customer/news',      label: t('socialFeed.navCta'),            active: activePath === '/customer/news',     icon: Newspaper },
    { href: '/chat',               label: t('chat.roomsTitle'),              active: activePath != null && activePath.startsWith('/chat'), icon: MessageCircle },
  ];
}
