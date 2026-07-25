import { motion } from 'framer-motion';
import AppShell from './AppShell';
import { useSession } from '../../utils/useSession';
import { useSyncedLocale } from '../../utils/i18n';
import { getCustomerNavItems } from '../../utils/useCustomerNav';

export default function CustomerShell({ pathname, children }) {
  const { profile, loading, signOut, refreshProfile } = useSession();
  const locale = useSyncedLocale();
  // Only customers get the 6-item nav; employees/founders who visit /chat
  // or /chat/dm/* still get AppShell (profile avatar + sign-out) but no nav.
  const navItems = profile?.role === 'customer' ? getCustomerNavItems(locale, pathname) : undefined;

  return (
    <AppShell
      navItems={navItems}
      onSignOut={signOut}
      userId={profile?.id}
      profile={profile ?? undefined}
      onProfileUpdated={refreshProfile}
    >
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AppShell>
  );
}
