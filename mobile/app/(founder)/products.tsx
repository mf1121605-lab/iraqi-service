import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ScreenBg } from '@/components/ui/ScreenBg';
import { hasFounderAccess, useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Product {
  id: string;
  title_ar: string;
  title_ckb: string | null;
  description_ar: string | null;
  price: number;
  discount: number | null;
  is_active: boolean;
  created_at: string;
}

const EMPTY = { titleAr: '', titleCkb: '', descAr: '', price: '', discount: '' };

export default function FounderProducts() {
  const { profile, loading } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
  }

  useEffect(() => { if (profile) loadProducts(); }, [profile?.id]);

  async function handleAdd() {
    if (!form.titleAr.trim() || !form.price) return;
    setSaving(true); setError('');
    const { error: err } = await supabase.from('products').insert({
      title_ar: form.titleAr.trim(),
      title_ckb: form.titleCkb.trim() || null,
      description_ar: form.descAr.trim() || null,
      price: parseFloat(form.price),
      discount: form.discount ? parseFloat(form.discount) : null,
      is_active: true,
    });
    if (err) { setError(err.message); } else { setForm(EMPTY); loadProducts(); }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('products').update({ is_active: !current }).eq('id', id);
    loadProducts();
  }

  async function handleDelete(id: string) {
    await supabase.from('products').delete().eq('id', id);
    loadProducts();
  }

  if (loading) return <ScreenBg><View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View></ScreenBg>;
  if (!hasFounderAccess(profile)) return <ScreenBg><View style={s.center}><Text style={s.denied}>غير مخوّل</Text></View></ScreenBg>;

  return (
    <ScreenBg>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Text style={s.backArrow}>‹</Text>
        </Pressable>
        <Text style={s.title}>📦 المنتجات</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Add form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>إضافة منتج جديد</Text>
          <TextInput style={s.input} value={form.titleAr} onChangeText={(v) => setForm(f => ({ ...f, titleAr: v }))} placeholder="الاسم (عربي) *" placeholderTextColor={COLORS.muted} textAlign="right" />
          <TextInput style={s.input} value={form.titleCkb} onChangeText={(v) => setForm(f => ({ ...f, titleCkb: v }))} placeholder="الاسم (كردي)" placeholderTextColor={COLORS.muted} textAlign="right" />
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} value={form.descAr} onChangeText={(v) => setForm(f => ({ ...f, descAr: v }))} placeholder="الوصف" placeholderTextColor={COLORS.muted} textAlign="right" multiline />
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} value={form.price} onChangeText={(v) => setForm(f => ({ ...f, price: v }))} placeholder="السعر (IQD) *" placeholderTextColor={COLORS.muted} keyboardType="numeric" />
            <TextInput style={[s.input, { flex: 1 }]} value={form.discount} onChangeText={(v) => setForm(f => ({ ...f, discount: v }))} placeholder="الخصم %" placeholderTextColor={COLORS.muted} keyboardType="numeric" />
          </View>
          {error ? <Text style={s.error}>{error}</Text> : null}
          <Pressable onPress={handleAdd} disabled={saving || !form.titleAr.trim() || !form.price} style={({ pressed }) => [s.addBtn, (saving || !form.titleAr.trim() || !form.price) && s.btnDisabled, pressed && { opacity: 0.75 }]}>
            <Text style={s.addBtnText}>{saving ? '...' : '+ إضافة'}</Text>
          </Pressable>
        </View>

        {/* Product list */}
        {products === null ? (
          <ActivityIndicator color={COLORS.gold} style={{ marginTop: 20 }} />
        ) : products.length === 0 ? (
          <Text style={s.emptyText}>لا توجد منتجات بعد</Text>
        ) : products.map((p) => (
          <View key={p.id} style={s.productCard}>
            <View style={s.productInfo}>
              <Text style={s.productName}>{p.title_ar}</Text>
              <Text style={s.productPrice}>{Number(p.price).toLocaleString('ar-IQ')} IQD{p.discount ? ` (خصم ${p.discount}%)` : ''}</Text>
            </View>
            <View style={s.actions}>
              <Pressable onPress={() => toggleActive(p.id, p.is_active)} style={[s.toggleBtn, { backgroundColor: p.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)' }]}>
                <Text style={[s.toggleText, { color: p.is_active ? '#22c55e' : COLORS.muted }]}>{p.is_active ? 'نشط' : 'مخفي'}</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(p.id)} hitSlop={8} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>✕</Text>
              </Pressable>
            </View>
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
  row: { flexDirection: 'row', gap: 8 },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: '#ef4444', textAlign: 'center' },
  addBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 14, color: '#000' },
  btnDisabled: { opacity: 0.4 },
  productCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  productInfo: { flex: 1 },
  productName: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  productPrice: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gold, textAlign: 'right', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  toggleBtn: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { fontFamily: FONTS.bold, fontSize: 11 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 14, color: '#ef4444' },
  emptyText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 20 },
});
