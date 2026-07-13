import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell, { useLocale } from '../../components/Layout/AppShell';
import { supabaseClient } from '../../lib/supabaseClient';
import { useRequireRole } from '../../utils/useSession';
import { translate } from '../../utils/i18n';

export default function ChatRooms() {
  const { profile, loading, signOut } = useRequireRole(['founder', 'employee', 'customer']);
  const locale = useLocale();
  const t = (path) => translate(locale, path);
  const [rooms, setRooms] = useState(null);

  useEffect(() => {
    if (!profile) return;
    supabaseClient
      .from('chat_rooms')
      .select('id, slug, name_ar, name_ckb')
      .eq('is_active', true)
      .then(({ data }) => setRooms(data ?? []));
  }, [profile]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-hero text-white">
        {t('common.loading')}
      </main>
    );
  }

  return (
    <AppShell onSignOut={signOut}>
      <h2 className="font-display text-xl font-bold">{t('chat.roomsTitle')}</h2>
      {rooms === null ? (
        <p className="mt-4 text-sm">{t('common.loading')}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.slug}`}
              className="glass-panel-dark rounded-xl2 p-6 font-semibold shadow-soft transition hover:scale-[1.02]"
            >
              {locale === 'ar' ? room.name_ar : room.name_ckb}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
