import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface SocialPost {
  id: string;
  content: string | null;
  image_url: string | null;
  approved: boolean;
  created_at: string;
  author: { given_name: string | null; phone: string | null } | null;
}

type TabType = 'pending' | 'all';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ar-IQ', {
    timeZone: 'Asia/Baghdad',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HqSocialPosts() {
  const { profile, loading } = useAuth();
  const [tab, setTab] = useState<TabType>('pending');
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  async function loadPosts(activeTab: TabType) {
    const query = supabase
      .from('social_posts')
      .select('id, content, image_url, approved, created_at, author:profiles!author_id(given_name, phone)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (activeTab === 'pending') query.eq('approved', false);
    const { data } = await query;
    setPosts((data ?? []) as unknown as SocialPost[]);
  }

  useEffect(() => {
    if (!profile) return;
    loadPosts(tab);
    const channel = supabase
      .channel('hq-social-posts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => loadPosts(tab))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, tab]);

  async function handleApprove(id: string) {
    setActing(id);
    await supabase.from('social_posts').update({ approved: true }).eq('id', id);
    setActing(null);
  }

  async function handleDelete(id: string) {
    setActing(id);
    await supabase.from('social_posts').delete().eq('id', id);
    setActing(null);
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!profile || (profile.role !== 'founder' && profile.role !== 'employee')) {
    return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;
  }

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>📰 منشورات الأخبار</Text>
      </View>

      <View style={s.tabs}>
        {(['pending', 'all'] as TabType[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => { setTab(t); setPosts(null); }}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'pending' ? 'في الانتظار' : 'الكل'}
            </Text>
          </Pressable>
        ))}
      </View>

      {posts === null ? (
        <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
      ) : posts.length === 0 ? (
        <View style={s.center}>
          <Text style={s.empty}>
            {tab === 'pending' ? 'لا توجد منشورات في انتظار الموافقة' : 'لا توجد منشورات'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {posts.map((post) => {
            const authorName = post.author?.given_name ?? post.author?.phone ?? '—';
            const isActing = acting === post.id;
            return (
              <View key={post.id} style={s.postCard}>
                <View style={s.postTop}>
                  <Text style={s.authorName}>👤 {authorName}</Text>
                  <View style={s.postTopRight}>
                    <View style={[s.statusBadge, { backgroundColor: post.approved ? '#22c55e20' : '#f59e0b20' }]}>
                      <Text style={[s.statusText, { color: post.approved ? '#22c55e' : '#f59e0b' }]}>
                        {post.approved ? 'منشور' : 'معلّق'}
                      </Text>
                    </View>
                    <Text style={s.postTime}>{formatTime(post.created_at)}</Text>
                  </View>
                </View>

                {post.content ? (
                  <Text style={s.postContent} numberOfLines={4}>{post.content}</Text>
                ) : null}
                {post.image_url ? (
                  <View style={s.imageIndicator}>
                    <Text style={s.imageIndicatorText}>🖼️ يحتوي على صورة</Text>
                  </View>
                ) : null}

                <View style={s.actions}>
                  {!post.approved && (
                    <Pressable
                      onPress={() => handleApprove(post.id)}
                      disabled={isActing}
                      style={[s.approveBtn, isActing && { opacity: 0.5 }]}
                    >
                      {isActing
                        ? <ActivityIndicator color="#000" size="small" />
                        : <Text style={s.approveBtnText}>✓ موافقة</Text>}
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => handleDelete(post.id)}
                    disabled={isActing}
                    style={[s.deleteBtn, isActing && { opacity: 0.5 }]}
                  >
                    {isActing && post.approved
                      ? <ActivityIndicator color="#ef4444" size="small" />
                      : <Text style={s.deleteBtnText}>✕ حذف</Text>}
                  </Pressable>
                </View>
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 17, color: COLORS.white },
  tabs: { flexDirection: 'row', marginHorizontal: 14, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.sm, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  tabBtnActive: { backgroundColor: COLORS.gold },
  tabText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.muted },
  tabTextActive: { color: '#000' },
  scroll: { padding: 14, gap: 10 },
  postCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, gap: 8 },
  postTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  authorName: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white },
  postTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  postTime: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  postContent: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white70, textAlign: 'right', lineHeight: 22 },
  imageIndicator: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-end' },
  imageIndicatorText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 2 },
  approveBtn: { backgroundColor: '#22c55e', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 7, minWidth: 80, alignItems: 'center' },
  approveBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#000' },
  deleteBtn: { borderWidth: 1, borderColor: '#ef4444', borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 7, minWidth: 60, alignItems: 'center' },
  deleteBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#ef4444' },
  empty: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center' },
});
