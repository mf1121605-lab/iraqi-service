import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface ServiceLink {
  id: string;
  label: string;
  url: string;
}

// Horizontal collapsible bar at the top of the HQ room — tap to expand a
// row of staff-curated service links, tap a link to open it. Any staff
// member in this (staff-only, RLS-gated) room can add a new one inline —
// no separate admin screen needed for something this small.
export function HqLinksBox() {
  const { profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [links, setLinks] = useState<ServiceLink[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    function load() {
      supabase
        .from('hq_service_links')
        .select('id, label, url')
        .order('sort_order', { ascending: true })
        .then(({ data }) => setLinks(data ?? []));
    }
    load();
    const channel = supabase
      .channel('hq-links-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hq_service_links' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function handleAdd() {
    if (!newLabel.trim() || !newUrl.trim() || !profile) return;
    await supabase.from('hq_service_links').insert({
      label: newLabel.trim(),
      url: newUrl.trim(),
      sort_order: links.length,
      created_by: profile.id,
    });
    setNewLabel('');
    setNewUrl('');
    setAdding(false);
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.toggleRow}>
        <Text style={styles.toggleText}>🔗 صندوق الروابط</Text>
        <Text style={styles.toggleArrow}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {links.map((l) => (
              <Pressable key={l.id} onPress={() => Linking.openURL(l.url)} style={styles.chip}>
                <Text style={styles.chipText}>{l.label}</Text>
              </Pressable>
            ))}
            {links.length === 0 && !adding && <Text style={styles.empty}>لا توجد روابط بعد</Text>}
          </ScrollView>

          {adding ? (
            <View style={styles.addForm}>
              <TextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="اسم الخدمة"
                placeholderTextColor={COLORS.white40}
                style={styles.input}
                textAlign="right"
              />
              <TextInput
                value={newUrl}
                onChangeText={setNewUrl}
                placeholder="الرابط"
                placeholderTextColor={COLORS.white40}
                style={styles.input}
                autoCapitalize="none"
                textAlign="right"
              />
              <View style={styles.addActions}>
                <Pressable onPress={handleAdd} style={styles.saveBtn}><Text style={styles.saveBtnText}>حفظ</Text></Pressable>
                <Pressable onPress={() => setAdding(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>إلغاء</Text></Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAdding(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ إضافة رابط</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, borderBottomColor: 'rgba(230,171,44,0.15)' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  toggleText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
  toggleArrow: { fontSize: 11, color: COLORS.white50 },
  panel: { paddingHorizontal: 10, paddingBottom: 10, gap: 8 },
  chipsRow: { gap: 8, paddingHorizontal: 4 },
  chip: {
    backgroundColor: 'rgba(230,171,44,0.1)', borderWidth: 1, borderColor: 'rgba(230,171,44,0.35)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  chipText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white },
  empty: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.white40, paddingVertical: 6 },
  addForm: { gap: 6, paddingHorizontal: 4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8,
    fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white,
  },
  addActions: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  saveBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: '#000' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center' },
  cancelBtnText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.white70 },
  addBtn: { alignSelf: 'flex-end', paddingHorizontal: 4, paddingVertical: 4 },
  addBtnText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.gold },
});
