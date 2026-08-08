import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Avatar } from '@/components/chat/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export type FollowTab = 'followers' | 'following';

interface Props {
  visible: boolean;
  /** Whose lists these are — not necessarily the signed-in user. */
  userId: string;
  initialTab?: FollowTab;
  onClose: () => void;
}

interface Person {
  id: string;
  given_name: string | null;
  family_name: string | null;
  avatar_key: string | null;
  bio: string | null;
}

const PAGE = 40;

const PROFILE_COLS = 'id, given_name, family_name, avatar_key, bio';

export function FollowersModal({ visible, userId, initialTab = 'followers', onClose }: Props) {
  const { session } = useAuth();
  const myId = session?.user.id;
  // "Owner" means these are the signed-in user's own lists, which is what
  // unlocks the management actions (remove a follower / unfollow).
  const isOwner = !!myId && myId === userId;

  const [tab, setTab] = useState<FollowTab>(initialTab);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState('');
  /** Everyone the SIGNED-IN user follows — drives each row's button state. */
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) { setTab(initialTab); setQuery(''); }
  }, [visible, initialTab]);

  // followers => rows pointing AT this user, and the person is the follower.
  // following => rows FROM this user, and the person is the one followed.
  const matchCol = tab === 'followers' ? 'following_id' : 'follower_id';
  const personCol = tab === 'followers' ? 'follower_id' : 'following_id';

  const fetchPage = useCallback(async (offset: number) => {
    // Deliberately not embedding profiles!${personCol}(...) here — that
    // join only ever resolved for a person who happens to be yourself or
    // staff (profiles RLS never granted a plain user visibility into an
    // arbitrary other row), so a follower list would silently drop rows
    // for everyone else. Fetch the id column plain, then batch-fetch
    // public_profiles (safe columns only, any viewer) and merge — same
    // fix as news.tsx's post/comment authors.
    const { data, error: err } = await supabase
      .from('follows')
      .select(`created_at, ${personCol}`)
      .eq(matchCol, userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1);

    if (err) return { rows: [] as Person[], err: err.message };
    const ids = (data ?? []).map((r) => (r as unknown as Record<string, string>)[personCol]);
    if (ids.length === 0) return { rows: [] as Person[], err: null as string | null };

    const { data: people, error: pErr } = await supabase
      .from('public_profiles')
      .select(PROFILE_COLS)
      .in('id', ids);
    if (pErr) return { rows: [] as Person[], err: pErr.message };

    // .in() doesn't preserve order — re-apply the follows table's own
    // created_at-desc ordering from `ids`.
    const byId = new Map((people ?? []).map((p) => [(p as Person).id, p as Person]));
    const rows = ids.map((id) => byId.get(id)).filter((p): p is Person => !!p);
    return { rows, err: null as string | null };
  }, [matchCol, personCol, userId]);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError('');
    setExhausted(false);

    const [{ rows, err }, mine] = await Promise.all([
      fetchPage(0),
      myId
        ? supabase.from('follows').select('following_id').eq('follower_id', myId)
        : Promise.resolve({ data: [] as { following_id: string }[] }),
    ]);

    if (err) setError(err);
    setPeople(rows);
    setExhausted(rows.length < PAGE);
    setMyFollowing(new Set(((mine.data ?? []) as { following_id: string }[]).map((r) => r.following_id)));
    setLoading(false);
  }, [fetchPage, myId]);

  useEffect(() => {
    if (visible) loadFirst();
  }, [visible, tab, loadFirst]);

  async function loadMore() {
    if (loadingMore || exhausted || loading) return;
    setLoadingMore(true);
    const { rows } = await fetchPage(people.length);
    setPeople((cur) => [...cur, ...rows]);
    if (rows.length < PAGE) setExhausted(true);
    setLoadingMore(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      `${p.given_name ?? ''} ${p.family_name ?? ''}`.toLowerCase().includes(q),
    );
  }, [people, query]);

  function openProfile(id: string) {
    onClose();
    // The real route is /user/[userId]; there is no /profile/[userId].
    router.push({ pathname: '/user/[userId]', params: { userId: id } });
  }

  /** Owner dropping someone who follows them. Needs the widened delete policy. */
  async function removeFollower(personId: string) {
    if (!myId) return;
    setBusyId(personId);
    const { error: err, count } = await supabase
      .from('follows')
      .delete({ count: 'exact' })
      .eq('follower_id', personId)
      .eq('following_id', myId);
    setBusyId(null);

    // Zero rows means the policy refused — surfaced rather than pretending.
    if (err || !count) {
      setError(err?.message ?? 'تعذّرت إزالة هذا المتابِع.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPeople((cur) => cur.filter((p) => p.id !== personId));
  }

  /** Follow / unfollow, from the signed-in user's perspective. */
  async function toggleFollow(personId: string) {
    if (!myId || personId === myId) return;
    const following = myFollowing.has(personId);
    setBusyId(personId);

    if (following) {
      const { error: err } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', myId)
        .eq('following_id', personId);
      if (!err) setMyFollowing((cur) => { const n = new Set(cur); n.delete(personId); return n; });
      else setError(err.message);
      // On the owner's own "following" tab an unfollow removes the row itself.
      if (!err && isOwner && tab === 'following') {
        setPeople((cur) => cur.filter((p) => p.id !== personId));
      }
    } else {
      const { error: err } = await supabase
        .from('follows')
        .insert({ follower_id: myId, following_id: personId });
      if (!err) setMyFollowing((cur) => new Set(cur).add(personId));
      else setError(err.message);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setBusyId(null);
  }

  function renderAction(p: Person) {
    if (p.id === myId) return null;   // never act on yourself
    const busy = busyId === p.id;

    // Owner viewing their own followers: the action is to drop that follower.
    if (isOwner && tab === 'followers') {
      return (
        <Pressable
          onPress={() => removeFollower(p.id)}
          disabled={busy}
          style={({ pressed }) => [s.actionBtn, s.removeBtn, pressed && { opacity: 0.75 }]}
        >
          {busy ? <ActivityIndicator size="small" color="#ef4444" />
                : <Text style={s.removeText}>إزالة</Text>}
        </Pressable>
      );
    }

    const following = myFollowing.has(p.id);
    return (
      <Pressable
        onPress={() => toggleFollow(p.id)}
        disabled={busy}
        style={({ pressed }) => [s.actionBtn, following ? s.followingBtn : s.followBtn, pressed && { opacity: 0.75 }]}
      >
        {busy ? <ActivityIndicator size="small" color={following ? COLORS.white70 : '#0d1117'} />
              : <Text style={following ? s.followingText : s.followText}>
                  {following ? 'متابَع ✓' : 'متابعة'}
                </Text>}
      </Pressable>
    );
  }

  const renderPerson: ListRenderItem<Person> = useCallback(({ item }) => {
    const name = [item.given_name, item.family_name].filter(Boolean).join(' ') || 'عضو';
    const sub = item.bio || '';
    return (
      <Animated.View entering={FadeIn.duration(160)}>
        <Pressable
          onPress={() => openProfile(item.id)}
          style={({ pressed }) => [s.row, pressed && { opacity: 0.75 }]}
        >
          {renderAction(item)}
          <View style={s.rowText}>
            <Text style={s.rowName} numberOfLines={1}>{name}</Text>
            {sub ? <Text style={s.rowSub} numberOfLines={1}>{sub}</Text> : null}
          </View>
          <Avatar avatarKey={item.avatar_key} name={name} seed={item.id} size={44} />
        </Pressable>
      </Animated.View>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, busyId, isOwner, tab, myFollowing]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={s.backdropTap} onPress={onClose} />

        <View style={s.sheet}>
          <View style={s.grabber} />

          <View style={s.tabs}>
            {(['followers', 'following'] as FollowTab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => { setTab(t); setPeople([]); }}
                style={[s.tab, tab === t && s.tabActive]}
              >
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>
                  {t === 'followers' ? 'المتابِعون' : 'المتابَعون'}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث بالاسم..."
            placeholderTextColor={COLORS.white40}
            style={s.search}
            textAlign="right"
            autoCapitalize="none"
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          {loading ? (
            <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
          ) : (
            <FlashList
              data={filtered}
              keyExtractor={(p) => p.id}
              contentContainerStyle={s.listPad}
              estimatedItemSize={68}
              keyboardShouldPersistTaps="handled"
              onEndReached={loadMore}
              onEndReachedThreshold={0.4}
              ListEmptyComponent={
                // FlashList's contentContainerStyle can't center this via
                // flexGrow the way FlatList's could, so the wrapper does it.
                <View style={s.emptyWrap}>
                  <Text style={s.empty}>
                    {query.trim()
                      ? 'لا توجد نتائج مطابقة'
                      : tab === 'followers' ? 'لا يوجد متابِعون بعد' : 'لا يتابع أحداً بعد'}
                  </Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? <ActivityIndicator color={COLORS.gold} style={{ marginVertical: 14 }} /> : null
              }
              renderItem={renderPerson}
            />
          )}

          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>إغلاق</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    height: '82%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.goldBorder,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  grabber: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.white20, marginVertical: 10,
  },

  // Rows read right-to-left: avatar, then text, then the action on the left.
  tabs: { flexDirection: 'row-reverse', gap: 8, marginBottom: 10 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  tabActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(230,171,44,0.12)' },
  tabText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white70 },
  tabTextActive: { color: COLORS.gold },

  search: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.white, fontFamily: FONTS.regular, fontSize: 14, marginBottom: 8,
  },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.red, textAlign: 'right', marginBottom: 6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listPad: { paddingBottom: 20 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center' },

  row: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.cardBorder,
  },
  rowText: { flex: 1 },
  rowName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  rowSub: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 1 },

  actionBtn: {
    minWidth: 84, paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  followBtn: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  followText: { fontFamily: FONTS.bold, fontSize: 12, color: '#0d1117' },
  followingBtn: { backgroundColor: 'transparent', borderColor: COLORS.goldBorder },
  followingText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white70 },
  removeBtn: { backgroundColor: 'rgba(239,68,68,0.13)', borderColor: 'rgba(239,68,68,0.35)' },
  removeText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },

  closeBtn: {
    marginTop: 6, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  closeText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white70 },
});
