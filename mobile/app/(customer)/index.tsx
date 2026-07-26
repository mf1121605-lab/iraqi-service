import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { GoldCard } from '@/components/ui/GoldCard';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

const CATEGORIES = [
  { key: 'military',  label: 'الخدمات العسكرية',  emoji: '🪖' },
  { key: 'education', label: 'الخدمات الدراسية',   emoji: '🎓' },
  { key: 'welfare',   label: 'الرعاية الاجتماعية', emoji: '❤️' },
  { key: 'general',   label: 'خدمات أخرى',          emoji: '⭐' },
];

type Announcement = {
  id: string;
  title_ar: string;
  description_ar: string | null;
  motion_graphic_key: string | null;
  background_color: string | null;
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
  const [urgentNews, setUrgentNews] = useState<UrgentNews[]>([]);
  const [newsLinks, setNewsLinks] = useState<NewsLink[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [ann, urgent, links] = await Promise.all([
      supabase
        .from('announcements')
        .select('id, title_ar, description_ar, motion_graphic_key, background_color')
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
    if (ann.data) setAnnouncements(ann.data);
    if (urgent.data) setUrgentNews(urgent.data);
    if (links.data) setNewsLinks(links.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    // Auto-advance banner
    const timer = setInterval(() => {
      setBannerIdx((i) => (i + 1) % Math.max(1, announcements.length));
    }, 4000);
    return () => clearInterval(timer);
  }, [loadData, announcements.length]);

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

  const greeting = profile?.given_name ? `أهلاً، ${profile.given_name}` : 'أهلاً بك';
  const banner = announcements[bannerIdx];

  return (
    <LinearGradient colors={['#0d1117', '#161b22', '#0d1117']} style={styles.bg}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>خدماتي</Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>

        {/* Announcement Banner */}
        {announcements.length > 0 && banner && (
          <GoldCard style={styles.bannerCard}>
            <LinearGradient
              colors={['rgba(230,171,44,0.15)', 'rgba(230,171,44,0.05)']}
              style={styles.bannerInner}
            >
              <Text style={styles.bannerEmoji}>
                {banner.motion_graphic_key === 'military'  ? '🪖' :
                 banner.motion_graphic_key === 'education' ? '🎓' :
                 banner.motion_graphic_key === 'welfare'   ? '❤️' :
                 banner.motion_graphic_key === 'general'   ? '⭐' : '🌟'}
              </Text>
              <Text style={styles.bannerTitle}>{banner.title_ar}</Text>
              {banner.description_ar ? (
                <Text style={styles.bannerDesc}>{banner.description_ar}</Text>
              ) : null}
            </LinearGradient>
            {/* Dot indicators */}
            {announcements.length > 1 && (
              <View style={styles.dots}>
                {announcements.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === bannerIdx && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </GoldCard>
        )}

        {/* Urgent News */}
        {urgentNews.length > 0 && (
          <View style={styles.section}>
            {urgentNews.map((item) => (
              <View key={item.id} style={styles.urgentCard}>
                <View style={styles.urgentBadge}>
                  <View style={styles.urgentDot} />
                  <Text style={styles.urgentBadgeText}>عاجل</Text>
                </View>
                <Text style={styles.urgentTitle}>{item.title_ar}</Text>
                {item.content_ar ? (
                  <Text style={styles.urgentContent}>{item.content_ar}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Service Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الخدمات المتاحة</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.key}
                style={({ pressed }) => [styles.catCard, pressed && styles.catCardPressed]}
                onPress={() => router.push({ pathname: '/(customer)/requests/new', params: { category: cat.key } })}
              >
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catArrow}>←</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* News Links */}
        {newsLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>روابط مفيدة</Text>
            {newsLinks.map((item) => (
              <GoldCard key={item.id} style={styles.newsLinkCard}>
                <Text style={styles.newsLinkText}>{item.title_ar}</Text>
                <Text style={styles.newsLinkArrow}>←</Text>
              </GoldCard>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },
  header: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  appName: { fontFamily: FONTS.bold, fontSize: 26, color: COLORS.gold },
  greeting: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  bannerCard: { padding: 0, overflow: 'hidden' },
  bannerInner: { padding: 24, alignItems: 'center', gap: 10 },
  bannerEmoji: { fontSize: 48 },
  bannerTitle: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.white, textAlign: 'center' },
  bannerDesc: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'center', lineHeight: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.white20 },
  dotActive: { backgroundColor: COLORS.gold, width: 16 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, textAlign: 'right' },
  urgentCard: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: RADIUS.md,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    gap: 6,
  },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  urgentBadgeText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },
  urgentTitle: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, textAlign: 'right' },
  urgentContent: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white70, textAlign: 'right', lineHeight: 20 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.2)',
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    minHeight: 100,
    justifyContent: 'center',
  },
  catCardPressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
  catEmoji: { fontSize: 32 },
  catLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, textAlign: 'center' },
  catArrow: { fontFamily: FONTS.regular, fontSize: 16, color: COLORS.gold },
  newsLinkCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  newsLinkText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white, flex: 1, textAlign: 'right' },
  newsLinkArrow: { fontFamily: FONTS.regular, fontSize: 18, color: COLORS.gold, marginLeft: 8 },
});
