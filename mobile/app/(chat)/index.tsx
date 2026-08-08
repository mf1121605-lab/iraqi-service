import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Avatar } from '@/components/chat/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface ChatRoom {
  id: string;
  slug: string;
  name_ar: string;
  name_ckb: string | null;
  icon_url: string | null;
}

interface OtherUserProfile {
  id: string;
  given_name: string | null;
  family_name: string | null;
  role: string;
  avatar_key: string | null;
}

interface DmThread {
  id: string;
  otherUser: OtherUserProfile | null;
}

function displayNameFor(p: OtherUserProfile | null): string {
  if (!p) return 'عضو';
  const parts = [p.given_name, p.family_name].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return 'عضو';
}

export default function ChatIndex() {
  const { profile, loading } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [dmThreads, setDmThreads] = useState<DmThread[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'rooms' | 'dms'>('rooms');

  useEffect(() => {
    if (!profile) return;

    function loadRooms() {
      supabase
        .from('chat_rooms')
        .select('id, slug, name_ar, name_ckb, icon_url')
        .eq('is_active', true)
        .then(({ data }) => setRooms(data ?? []));
    }

    loadRooms();

    const channel = supabase
      .channel('chat-rooms-list-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, loadRooms)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // Deliberately depends on the stable id, not the whole profile object
    // (same convention throughout this codebase).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;

    async function loadDmThreads() {
      const { data: threads } = await supabase
        .from('direct_message_threads')
        .select('id, user_a_id, user_b_id')
        .or(`user_a_id.eq.${profile!.id},user_b_id.eq.${profile!.id}`);
      const rows = threads ?? [];
      if (rows.length === 0) { setDmThreads([]); return; }

      const otherIds = rows.map((row: any) =>
        row.user_a_id === profile!.id ? row.user_b_id : row.user_a_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, given_name, family_name, role, avatar_key')
        .in('id', otherIds);

      const profileById = new Map((profiles ?? []).map((p: OtherUserProfile) => [p.id, p]));
      setDmThreads(
        rows.map((row: any) => ({
          id: row.id,
          otherUser: profileById.get(row.user_a_id === profile!.id ? row.user_b_id : row.user_a_id) ?? null,
        }))
      );
    }

    loadDmThreads();

    const channel = supabase
      .channel('chat-dm-threads-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_message_threads' }, loadDmThreads)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const q = query.trim().toLowerCase();

  const filteredRooms = useMemo(
    () => (rooms ?? []).filter(r => !q || r.name_ar.toLowerCase().includes(q)),
    [rooms, q]
  );

  const filteredDms = useMemo(
    () => dmThreads.filter(t => !q || displayNameFor(t.otherUser).toLowerCase().includes(q)),
    [dmThreads, q]
  );

  if (loading || !profile) {
    return (
      <ScreenBg>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </ScreenBg>
    );
  }

  return (
    <ScreenBg>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المحادثات</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث في المحادثات..."
          placeholderTextColor={COLORS.white40}
          style={styles.search}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'rooms' && styles.tabActive]}
          onPress={() => setTab('rooms')}
        >
          <Text style={[styles.tabText, tab === 'rooms' && styles.tabTextActive]}>غرف المجتمع</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'dms' && styles.tabActive]}
          onPress={() => setTab('dms')}
        >
          <Text style={[styles.tabText, tab === 'dms' && styles.tabTextActive]}>
            محادثات خاصة{dmThreads.length > 0 ? ` (${dmThreads.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {tab === 'rooms' ? (
        rooms === null ? (
          <View style={{ padding: 16, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Skeleton width={44} height={44} radius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="50%" height={12} />
                  <Skeleton width="30%" height={10} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={8}
            initialNumToRender={10}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => router.push(`/(chat)/${item.slug}`)}
              >
                <View style={styles.roomIcon}>
                  <Text style={styles.roomIconText}>💬</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name_ar}</Text>
                  <Text style={styles.cardSub}>مجموعة خدمات العراق</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <EmptyState emoji="🏘️" title="لا توجد غرف متاحة" subtitle="ستظهر هنا أي غرف محادثة جماعية تنضم إليها" />
            }
          />
        )
      ) : (
        <FlatList
          data={filteredDms}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          windowSize={8}
          initialNumToRender={10}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/(chat)/dm/${item.id}`)}
            >
              <Avatar
                avatarKey={item.otherUser?.avatar_key}
                name={item.otherUser?.given_name}
                seed={item.otherUser?.id}
                size={44}
              />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{displayNameFor(item.otherUser)}</Text>
                <Text style={styles.cardSub}>محادثة خاصة</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState emoji="💬" title="لا توجد محادثات خاصة" subtitle="ابدأ محادثة من صفحة أي مستخدم لتظهر هنا" />
          }
        />
      )}
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.white10,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    textAlign: 'right',
  },
  searchRow: {
    marginHorizontal: 16,
    marginVertical: 10,
  },
  search: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'right',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.bgAlt,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
  },
  tabText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white50,
  },
  tabTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.gold,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 12,
  },
  cardPressed: { opacity: 0.75 },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230,171,44,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomIconText: { fontSize: 20 },
  cardBody: { flex: 1 },
  cardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'right',
  },
  cardSub: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
    marginTop: 2,
  },
  arrow: {
    fontSize: 20,
    color: COLORS.white40,
  },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 40,
  },
});
