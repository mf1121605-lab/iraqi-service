import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface ChatRoom {
  id: string;
  slug: string;
  name_ar: string | null;
  name_ckb: string | null;
  created_at: string;
}

export default function FounderChatRooms() {
  const { profile, loading } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);
  const [slug, setSlug] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameCkb, setNameCkb] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadRooms() {
    const { data } = await supabase.from('chat_rooms').select('*').order('created_at', { ascending: false });
    setRooms((data ?? []) as ChatRoom[]);
  }

  useEffect(() => { if (profile) loadRooms(); }, [profile?.id]);

  async function handleAdd() {
    if (!slug.trim() || !nameAr.trim()) return;
    setSaving(true); setError('');
    const { error: err } = await supabase.from('chat_rooms').insert({ slug: slug.trim().toLowerCase(), name_ar: nameAr.trim(), name_ckb: nameCkb.trim() || null });
    if (err) { setError(err.message); } else { setSlug(''); setNameAr(''); setNameCkb(''); loadRooms(); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('chat_rooms').delete().eq('id', id);
    loadRooms();
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>💬 غرف الدردشة</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Add form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>إضافة غرفة جديدة</Text>
          <TextInput style={s.input} value={slug} onChangeText={setSlug} placeholder="المعرّف (slug)" placeholderTextColor={COLORS.muted} autoCapitalize="none" />
          <TextInput style={s.input} value={nameAr} onChangeText={setNameAr} placeholder="الاسم (عربي)" placeholderTextColor={COLORS.muted} textAlign="right" />
          <TextInput style={s.input} value={nameCkb} onChangeText={setNameCkb} placeholder="الاسم (كردي) — اختياري" placeholderTextColor={COLORS.muted} textAlign="right" />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable onPress={handleAdd} disabled={saving || !slug.trim() || !nameAr.trim()} style={({ pressed }) => [s.addBtn, (saving || !slug.trim() || !nameAr.trim()) && s.btnDisabled, pressed && { opacity: 0.75 }]}>
            <Text style={s.addBtnText}>{saving ? '...' : '+ إضافة'}</Text>
          </Pressable>
        </View>

        {/* Room list */}
        {rooms === null ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 20 }} />
        ) : rooms.length === 0 ? (
          <Text style={s.emptyText}>لا توجد غرف بعد</Text>
        ) : rooms.map((room) => (
          <View key={room.id} style={s.roomCard}>
            <View style={s.roomInfo}>
              <Text style={s.roomName}>{room.name_ar ?? room.slug}</Text>
              <Text style={s.roomSlug}>{room.slug}</Text>
            </View>
            <Pressable onPress={() => handleDelete(room.id)} hitSlop={8} style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.6 }]}>
              <Text style={s.deleteBtnText}>حذف</Text>
            </Pressable>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBg>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  denied: { color: COLORS.white, fontFamily: FONTS.bold, fontSize: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, color: COLORS.gold, lineHeight: 32 },
  title: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white },
  scroll: { padding: 16, gap: 12 },
  formCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 16, gap: 10 },
  formTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FONTS.regular, fontSize: 14, color: COLORS.white },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: '#ef4444', textAlign: 'center' },
  addBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  btnDisabled: { opacity: 0.4 },
  roomCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roomInfo: { flex: 1 },
  roomName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  roomSlug: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 20 },
});
