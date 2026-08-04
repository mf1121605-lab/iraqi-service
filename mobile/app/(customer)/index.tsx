import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { Icon3D } from '@/components/ui/Icon3D';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import AnnouncementBanner from '@/components/ui/AnnouncementBanner';

// Emoji + color theme per category key — fallback for unknown keys
const CAT_THEMES: Record<string, { emoji: string; accent: string; colors: [string, string] }> = {
  military:  { emoji: '🪖', accent: '#7da9cc', colors: ['#1c2a38', '#0f1c28'] },
  education: { emoji: '🎓', accent: '#4f8bff', colors: ['#1a2640', '#0d1a33'] },
  welfare:   { emoji: '❤️', accent: '#e14b6a', colors: ['#2a1a1a', '#1f0f0f'] },
  general:   { emoji: '⭐', accent: '#e6ab2c', colors: ['#28220d', '#1c180a'] },
};
const DEFAULT_THEME = { emoji: '🔹', accent: '#e6ab2c', colors: ['#1a1a2e', '#0f0f1a'] as [string, string] };

type Category = {
  id: string;
  key: string;
  label_ar: string;
  section_type: string | null;
};

type Announcement = {
  id: string;
  title_ar: string;
  description_ar: string | null;
  motion_graphic_key: string | null;
};

type UrgentNews = {
  id: string;
  title_ar: string;
  content_ar: string | null;
};

type NewsLink = {
  id: string;
  title_ar: string;
  source: string | null;
  url: string | null;
};

export default function CustomerDashboard() {
  const { profile, session } = useAuth();
  const [categories, setCategories]     = useState<Category[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [urgentNews, setUrgentNews]       = useState<UrgentNews[]>([]);
  const [newsLinks, setNewsLinks]         = useState<NewsLink[]>([]);
  const [bannerIdx, setBannerIdx]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Notifications lost its own bottom tab (bar is now focused on news +
  // messages) — this bell is its only remaining entry point, so it needs
  // to own the unread badge that used to live on the tab bar.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    async function fetchUnread() {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId as string)
        .eq('is_read', false);
      setUnreadCount(count ?? 0);
    }

    fetchUnread();
    const channel = supabase
      .channel(`notif-badge-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id]);

  const loadData = useCallback(async () => {
    const [cats, ann, urgent, links] = await Promise.all([
      supabase
        .from('categories')
        .select('id, key, label_ar, section_type')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('announcements')
        .select('id, title_ar, description_ar, motion_graphic_key')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(5),
      supabase
        .from('urgent_news')
        .select('id, title_ar, content_ar')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('news_links')
        .select('id, title_ar, source, url')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (cats.data)   setCategories(cats.data);
    if (ann.data)    setAnnouncements(ann.data);
    if (urgent.data) setUrgentNews(urgent.data);
    if (links.data)  setNewsLinks(links.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-advance banner with fade transition
  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setBannerIdx((i) => (i + 1) % announcements.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length, fadeAnim]);

  function onRefresh() {
    setRefreshing(true);
    loadData();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  const banner    = announcements[bannerIdx] ?? null;
  const greeting  = profile?.given_name ? `أهلاً، ${profile.given_name} 👋` : 'أهلاً بك 👋';
  const services  = categories.filter((c) => c.section_type !== 'tools');
  const tools     = categories.filter((c) => c.section_type === 'tools');

  return (
    <ScreenBg>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('@/assets/full-logo-transparent.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.appName}>خدماتي</Text>
                <Text style={styles.appSub}>منصة الخدمات العراقية</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push('/(customer)/communities')}
                style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={styles.searchIcon}>🏘️</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(customer)/notifications')}
                style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={styles.searchIcon}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push('/(customer)/search')}
                style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Text style={styles.searchIcon}>🔍</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* ── Announcement Carousel ── */}
        {banner ? (
          <View style={styles.bannerWrap}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <AnnouncementBanner
                key={banner.id}
                titleAr={banner.title_ar}
                descriptionAr={banner.description_ar}
                motionGraphicKey={banner.motion_graphic_key}
              />
            </Animated.View>
            {announcements.length > 1 && (
              <View style={styles.dots}>
                {announcements.map((_, i) => (
                  <Pressable key={i} onPress={() => setBannerIdx(i)}>
                    <View style={[styles.dot, i === bannerIdx && styles.dotActive]} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* ── Quick Action ── */}
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
          onPress={() => router.push('/(customer)/requests/new')}
        >
          <LinearGradient colors={['#e6ab2c', '#c9882a']} style={styles.ctaGrad}>
            <Text style={styles.ctaIcon}>＋</Text>
            <Text style={styles.ctaLabel}>تقديم طلب جديد</Text>
          </LinearGradient>
        </Pressable>

        {/* ── Urgent News ── */}
        {urgentNews.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="أخبار عاجلة" icon="🔴" />
            {urgentNews.map((item) => (
              <View key={item.id} style={styles.urgentCard}>
                <View style={styles.urgentHeader}>
                  <View style={styles.urgentPulse} />
                  <Text style={styles.urgentBadge}>عاجل</Text>
                </View>
                <Text style={styles.urgentTitle}>{item.title_ar}</Text>
                {item.content_ar ? <Text style={styles.urgentBody}>{item.content_ar}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* ── Services ── */}
        {services.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="الخدمات المتاحة" icon="🛠️" />
            <CategoryGrid items={services} />
          </View>
        )}

        {/* ── Tools ── */}
        {tools.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="الأدوات المهمة" icon="🔧" />
            <CategoryGrid items={tools} />
          </View>
        )}

        {/* ── Quick shortcuts row ── */}
        <View style={styles.shortcutsRow}>
          <Pressable
            style={({ pressed }) => [styles.shortcutCard, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/(customer)/news')}
          >
            <Text style={styles.shortcutEmoji}>📰</Text>
            <Text style={styles.shortcutTitle}>آخر الأخبار</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.shortcutCard, pressed && { opacity: 0.8 }]}
            onPress={() => router.push('/(chat)/')}
          >
            <Text style={styles.shortcutEmoji}>💬</Text>
            <Text style={styles.shortcutTitle}>الرسائل الخاصة</Text>
          </Pressable>
        </View>

        {/* ── News Links ── */}
        {newsLinks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="إعلانات وروابط مفيدة" icon="📌" />
            <View style={styles.linkList}>
              {newsLinks.map((item, idx) => (
                <Pressable
                  key={item.id}
                  style={[styles.linkRow, idx < newsLinks.length - 1 && styles.linkRowBorder]}
                  onPress={() => item.url ? Linking.openURL(item.url) : undefined}
                >
                  <Text style={styles.linkBullet}>📌</Text>
                  <View style={styles.linkContent}>
                    <Text style={styles.linkText} numberOfLines={2}>{item.title_ar}</Text>
                    {item.source ? <Text style={styles.linkSource}>{item.source}</Text> : null}
                  </View>
                  {item.url ? <Text style={styles.linkArrow}>←</Text> : null}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenBg>
  );
}

function CategoryGrid({ items }: { items: Category[] }) {
  return (
    <View style={styles.catGrid}>
      {items.map((cat) => {
        const theme = CAT_THEMES[cat.key] ?? DEFAULT_THEME;
        return (
          <Pressable
            key={cat.key}
            style={({ pressed }) => [styles.catTouchable, pressed && styles.catPressed]}
            onPress={() => router.push({ pathname: '/(customer)/requests/new', params: { category: cat.key } })}
          >
            <LinearGradient colors={theme.colors} style={styles.catCard}>
              <View style={[styles.catAccentDot, { backgroundColor: theme.accent + '40' }]} />
              <Text style={styles.catEmoji}>{theme.emoji}</Text>
              <Text style={styles.catLabel}>{cat.label_ar}</Text>
              <View style={[styles.catPill, { backgroundColor: theme.accent + '22', borderColor: theme.accent + '55' }]}>
                <Text style={[styles.catPillText, { color: theme.accent }]}>اختر</Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={secStyles.row}>
      <View style={secStyles.line} />
      <Icon3D emoji={icon} size={26} animation="none" />
      <Text style={secStyles.title}>{title}</Text>
    </View>
  );
}

const secStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, textAlign: 'right' },
  line:  { flex: 1, height: 1, backgroundColor: 'rgba(230,171,44,0.2)' },
});

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 20 },

  header:    { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(230,171,44,0.1)',
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchIcon: { fontSize: 18 },
  bellBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: COLORS.bg,
  },
  bellBadgeText: { fontFamily: FONTS.bold, fontSize: 9, color: '#fff' },
  logoBadge: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(230,171,44,0.4)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#e6ab2c', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  // Same single brand asset used app-wide (login/register/splash) — real
  // aspect ratio of full-logo-transparent.png is 900×823.
  logoImage: { width: 38, height: 38 * (823 / 900) },
  appName:   { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold, letterSpacing: 0.5 },
  appSub:    { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  greeting:  { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.white70, textAlign: 'right' },

  bannerWrap: { gap: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: COLORS.gold, width: 20, borderRadius: 3 },

  ctaBtn:        { borderRadius: RADIUS.md, overflow: 'hidden', elevation: 6 },
  ctaBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  ctaIcon:  { fontSize: 22, color: '#1a1000', fontFamily: FONTS.bold },
  ctaLabel: { fontFamily: FONTS.bold, fontSize: 17, color: '#1a1000' },

  section: { gap: 10 },

  urgentCard: {
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: RADIUS.md, padding: 14, gap: 6,
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentPulse:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  urgentBadge: {
    fontFamily: FONTS.bold, fontSize: 11, color: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  urgentTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, textAlign: 'right', lineHeight: 24 },
  urgentBody:  { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right', lineHeight: 22 },

  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catTouchable: { flexBasis: '47%', flexGrow: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  catPressed:   { opacity: 0.75, transform: [{ scale: 0.96 }] },
  catCard: {
    padding: 18, alignItems: 'center', gap: 8, minHeight: 120,
    justifyContent: 'center', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative', overflow: 'hidden',
  },
  catAccentDot: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40 },
  catEmoji:     { fontSize: 36 },
  catLabel: {
    fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white,
    textAlign: 'center', lineHeight: 20,
  },
  catPill:     { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  catPillText: { fontFamily: FONTS.bold, fontSize: 11 },

  shortcutsRow: { flexDirection: 'row', gap: 12 },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.2)',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  shortcutEmoji: { fontSize: 28 },
  shortcutTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, textAlign: 'center' },

  communityCard: {
    backgroundColor: '#161b22', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.2)',
    overflow: 'hidden',
  },
  communityInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16,
  },
  communityEmoji: { fontSize: 32 },
  communityText:  { flex: 1 },
  communityTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, textAlign: 'right' },
  communitySub:   { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted, textAlign: 'right', marginTop: 2 },
  communityArrow: { fontFamily: FONTS.regular, fontSize: 18, color: COLORS.gold },

  linkList: {
    backgroundColor: '#161b22', borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.15)', overflow: 'hidden',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  linkBullet:  { fontSize: 14 },
  linkContent: { flex: 1 },
  linkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white70, textAlign: 'right' },
  linkSource: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 2 },
  linkArrow: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.gold },
});
