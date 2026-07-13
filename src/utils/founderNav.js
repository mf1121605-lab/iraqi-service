import { translate } from './i18n';

export function useFounderNav(locale, activePage) {
  const t = (path) => translate(locale, path);
  return [
    { href: '/founder/dashboard', label: t('founderNav.dashboard'), active: activePage === 'dashboard' },
    { href: '/founder/categories', label: t('founderNav.categories'), active: activePage === 'categories' },
    { href: '/founder/banners', label: t('founderNav.banners'), active: activePage === 'banners' },
    { href: '/founder/products', label: t('founderNav.products'), active: activePage === 'products' },
    { href: '/founder/chat-rooms', label: t('founderNav.chatRooms'), active: activePage === 'chat-rooms' },
    { href: '/founder/employees', label: t('founderNav.employees'), active: activePage === 'employees' },
    { href: '/founder/settings', label: t('founderNav.settings'), active: activePage === 'settings' },
    { href: '/founder/audit-log', label: t('founderNav.auditLog'), active: activePage === 'audit-log' },
  ];
}
