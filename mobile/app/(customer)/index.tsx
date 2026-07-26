import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CATEGORIES = [
  {
    key: 'military',
    label: 'الخدمات\nالعسكرية',
    emoji: '🪖',
    colors: ['#1c2a38', '#0f1c28'] as [string, string],
    accent: '#7da9cc',
  },
  {
    key: 'education',
    label: 'الخدمات\nالدراسية',
    emoji: '🎓',
    colors: ['#1a2640', '#0d1a33'] as [string, string],
    accent: '#4f8bff',
  },
  {
    key: 'welfare',
    label: 'الرعاية\nالاجتماعية',
    emoji: '❤️',
    colors: ['#2a1a1a', '#1f0f0f'] as [string, string],
    accent: '#e14b6a',
  },
  {
    key: 'general',
    label: 'خدمات\nأخرى',
    emoji: '⭐',
    colors: ['#28220d', '#1c180a'] as [string, string],
    accent: '#e6ab2c',
  },
];

const BANNER_EMOJI: Record<string, string> = {
  welcome:   '🌟',
  military:  '🪖',
  education: '🎓',
  welfare:   '❤️',
  general:   '⭐',
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
  url: string;
};

export default function CustomerDashboard() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [urgentNews, setUrgentNews]       = useState<UrgentNews[]>([]);
  const [newsLinks, setNewsLinks]         = useState<NewsLink[]>([]);
  const [bannerIdx, setBannerIdx]         = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    const [ann, urgent, links] = await Promise.all([
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
        .select('id, title_ar, url')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(10),
    ]);
    if (ann.data)    setAnnouncements(ann.data);
    if (urgent.data) setUrgentNews(urgent.data);
    if (links.data)  setNewsLinks(links.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Auto-advance banner with fade transition
  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const banner  = announcements[bannerIdx] ?? null;
  const greeting = profile?.given_name ? `أهلاً، ${profile.given_name} 👋` : 'أهلاً بك 👋';

  return (
    <LinearGradient colors={['#080c12', '#0d1117', '#080c12']} style={styles.bg}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🏛️</Text>
            </View>
            <View>
              <Text style={styles.appName}>خدماتي</Text>
              <Text style={styles.appSub}>منصة الخدمات العراقية</Text>
            </View>
          </View>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* ── Announcement Carousel ── */}
        {banner ? (
          <View style={styles.bannerWrap}>
            <Animated.View style={[styles.bannerCard, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={['rgba(230,171,44,0.18)', 'rgba(230,171,44,0.04)', 'transparent']}
                style={styles.bannerGrad}
              >
                <Text style={styles.bannerEmoji}>
                  {BANNER_EMOJI[banner.motion_graphic_key ?? ''] ?? '🌟'}
                </Text>
                <Text style={styles.bannerTitle}>{banner.title_ar}</Text>
                {banner.description_ar ? (
                  <Text style={styles.bannerDesc}>{banner.description_ar}</Text>
                ) : null}
              </LinearGradient>
              {/* Gold shimmer top border */}
              <View style={styles.bannerTopLine} />
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
                {item.content_ar ? (
                  <Text style={styles.urgentBody}>{item.content_ar}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* ── Service Categories ── */}
        <View style={styles.section}>
          <SectionHeader title="الخدمات المتاحة" icon="🛠️" />
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={({ pressed }) => [styles.catTouchable, pressed && styles.catPressed]}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/requests/new',
                    params: { category: cat.key },
                  })
                }
              >
                <LinearGradient colors={cat.colors} style={styles.catCard}>
                  <View style={[styles.catAccentDot, { backgroundColor: cat.accent + '40' }]} />
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                  <View style={[styles.catPill, { backgroundColor: cat.accent + '22', borderColor: cat.accent + '55' }]}>
                    <Text style={[styles.catPillText, { color: cat.accent }]}>اختر</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── News Links ── */}
        {newsLinks.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="روابط مفيدة" icon="🔗" />
            <View style={styles.linkList}>
              {newsLinks.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.linkRow,
                    idx < newsLinks.length - 1 && styles.linkRowBorder,
                  ]}
                >
                  <Text style={styles.linkArrow}>←</Text>
                  <Text style={styles.linkText} numberOfLines={1}>{item.title_ar}</Text>
                  <Text style={styles.linkBullet}>📌</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </LinearGradient>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={secStyles.row}>
      <View style={secStyles.line} />
      <Text style={secStyles.icon}>{icon}</Text>
      <Text style={secStyles.title}>{title}</Text>
    </View>
  );
}

const secStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, textAlign: 'right' },
  icon:  { fontSize: 16 },
  line:  { flex: 1, height: 1, backgroundColor: 'rgba(230,171,44,0.2)' },
});

const styles = StyleSheet.create({
  bg:     { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 20 },

  header: { gap: 12, paddingTop: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  logoEmoji: { fontSize: 24 },
  appName:   { fontFamily: FONTS.bold, fontSize: 22, color: COLORS.gold, letterSpacing: 0.5 },
  appSub:    { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  greeting:  { fontFamily: FONTS.regular, fontSize: 15, color: COLORS.white70, textAlign: 'right' },

  bannerWrap: { gap: 10 },
  bannerCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.3)',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  bannerTopLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: 'rgba(230,171,44,0.6)',
  },
  bannerGrad: {
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  bannerEmoji: { fontSize: 60 },
  bannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  bannerDesc: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white70,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: { backgroundColor: COLORS.gold, width: 20, borderRadius: 3 },

  ctaBtn: { borderRadius: RADIUS.md, overflow: 'hidden', elevation: 6 },
  ctaBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  ctaIcon:  { fontSize: 22, color: '#1a1000', fontFamily: FONTS.bold },
  ctaLabel: { fontFamily: FONTS.bold, fontSize: 17, color: '#1a1000' },

  section: { gap: 10 },

  urgentCard: {
    backgroundColor: 'rgba(239,68,68,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  urgentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  urgentBadge: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: '#ef4444',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  urgentTitle: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'right',
    lineHeight: 24,
  },
  urgentBody: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.white70,
    textAlign: 'right',
    lineHeight: 22,
  },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catTouchable: { flexBasis: '47%', flexGrow: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  catPressed:   { opacity: 0.75, transform: [{ scale: 0.96 }] },
  catCard: {
    padding: 18,
    alignItems: 'center',
    gap: 8,
    minHeight: 120,
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  catAccentDot: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  catEmoji: { fontSize: 36 },
  catLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 20,
  },
  catPill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 2,
  },
  catPillText: { fontFamily: FONTS.bold, fontSize: 11 },

  linkList: {
    backgroundColor: '#161b22',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.15)',
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  linkBullet: { fontSize: 14 },
  linkText: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white70,
    textAlign: 'right',
  },
  linkArrow: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.gold },
});
