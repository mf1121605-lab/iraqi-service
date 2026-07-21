import {
  AlertTriangle,
  BarChart3,
  Database,
  Image as ImageIcon,
  LayoutDashboard,
  ListTree,
  MessageCircle,
  Newspaper,
  Radio,
  ScrollText,
  Settings,
  Tags,
  Users,
  Zap,
} from 'lucide-react';
import { translate } from './i18n';

export function useFounderNav(locale, active) {
  const t = (path) => translate(locale, path);
  return [
    { href: '/founder/dashboard', label: t('founderPanel.navDashboard'), active: active === 'dashboard', icon: LayoutDashboard },
    { href: '/founder/categories', label: t('founderCategories.title'), active: active === 'categories', icon: Tags },
    { href: '/founder/category-services', label: t('founderCategoryServices.title'), active: active === 'category-services', icon: ListTree },
    { href: '/founder/banners', label: t('founderBanners.title'), active: active === 'banners', icon: ImageIcon },
    { href: '/founder/users', label: t('founderPanel.navUsers'), active: active === 'users', icon: Users },
    { href: '/founder/users-data', label: t('founderPanel.navUsersData'), active: active === 'users-data', icon: Database },
    { href: '/founder/stats', label: t('founderPanel.navStats'), active: active === 'stats', icon: BarChart3 },
    { href: '/founder/audit-log', label: t('founderPanel.navAuditLog'), active: active === 'audit-log', icon: ScrollText },
    { href: '/founder/settings', label: t('founderSettings.title'), active: active === 'settings', icon: Settings },
    { href: '/chat/hq', label: t('hq.chatNavCta'), icon: Radio },
    { href: '/hq/news-links', label: t('hq.newsLinksNavCta'), icon: Newspaper },
    { href: '/hq/urgent-news', label: t('urgentNews.navCta'), active: active === 'urgent-news', icon: AlertTriangle },
    { href: '/founder/quick-requests', label: t('founderPanel.navQuickRequests'), active: active === 'quick-requests', icon: Zap },
    { href: '/chat', label: t('chat.roomsTitle'), icon: MessageCircle },
  ];
}
