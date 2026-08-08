import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { GlassCard } from '@/components/ui/GlassCard';
import { COLORS, FONTS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Fixed student community rooms — matched by slug in chat_rooms table
const STUDENT_ROOMS = [
  {
    slug: 'grade-9-community',
    nameAr: 'تجمع طلبة الثالث المتوسط',
    emoji: '📚',
    color: '#3b82f6',
    desc: 'مناقشة المواد والامتحانات',
  },
  {
    slug: 'grade-12-science-community',
    nameAr: 'تجمع طلبة السادس علمي',
    emoji: '🔬',
    color: '#22c55e',
    desc: 'الرياضيات والفيزياء والكيمياء والأحياء',
  },
  {
    slug: 'masters-community',
    nameAr: 'تجمع طلبة الماجستير',
    emoji: '🎓',
    color: '#a855f7',
    desc: 'أبحاث ورسائل الدراسات العليا',
  },
] as const;

type Room = { id: string; slug: string; name_ar: string; member_count?: number };

export default function CommunitiesScreen() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    supabase
      .from('chat_rooms')
      .select('id, slug, name_ar')
      .in('slug', STUDENT_ROOMS.map((r) => r.slug))
      .then(({ data }) => {
        const map: Record<string, Room> = {};
        (data ?? []).forEach((r) => { map[r.slug] = r; });
        setRooms(map);
        setLoading(false);
      });
  }, [profile]);

  if (!profile) return null;

  return (
    <ScreenBg>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏘️ المجتمعات الطلابية</Text>
          <Text style={styles.subtitle}>تواصل مع زملائك وشارك المعرفة</Text>
        </View>

        {/* Room cards */}
        {loading ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {STUDENT_ROOMS.map((room) => {
              const dbRoom = rooms[room.slug];
              return (
                <Pressable
                  key={room.slug}
                  style={({ pressed }) => [pressed && { opacity: 0.82 }]}
                  onPress={() => {
                    if (dbRoom) {
                      router.push(`/(customer)/communities/${dbRoom.id}`);
                    }
                  }}
                >
                  <GlassCard style={styles.card} borderRadius={22} borderSpeed={4000 + Math.random() * 2000}>
                    {/* Colour accent dot */}
                    <View style={[styles.accentDot, { backgroundColor: room.color }]} />

                    {/* Emoji badge */}
                    <View style={[styles.emojiBadge, { backgroundColor: `${room.color}20`, borderColor: `${room.color}40` }]}>
                      <Text style={styles.emoji}>{room.emoji}</Text>
                    </View>

                    {/* Info */}
                    <Text style={styles.roomName}>{room.nameAr}</Text>
                    <Text style={styles.roomDesc}>{room.desc}</Text>

                    {/* Status */}
                    <View style={styles.footer}>
                      <View style={[styles.onlineDot, { backgroundColor: dbRoom ? COLORS.green : COLORS.muted }]} />
                      <Text style={styles.statusText}>
                        {dbRoom ? 'مفتوح الآن' : 'قريباً'}
                      </Text>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Info banner */}
        <GlassCard style={styles.infoBanner} borderRadius={16} borderSpeed={6000}>
          <Text style={styles.infoText}>
            💡 المجتمعات مفتوحة لجميع المستخدمين. احترم زملاءك والتزم بآداب النقاش.
          </Text>
        </GlassCard>
      </ScrollView>
    </ScreenBg>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, gap: 16, paddingBottom: 32 },

  header: { alignItems: 'center', gap: 6, marginBottom: 8 },
  title:    { fontFamily: FONTS.bold,    fontSize: 22, color: COLORS.gold },
  subtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center' },

  grid: { gap: 14 },

  card: { minHeight: 140 },

  accentDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  emojiBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emoji: { fontSize: 28 },

  roomName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 4,
    textAlign: 'right',
  },
  roomDesc: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
    marginBottom: 14,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },

  infoBanner: { marginTop: 4 },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.white70,
    textAlign: 'right',
    lineHeight: 20,
  },
});
