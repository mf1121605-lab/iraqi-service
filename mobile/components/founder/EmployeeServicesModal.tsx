import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface ServiceRow {
  id: string;
  label_ar: string;
  category_key: string;
}

interface CategoryRow {
  key: string;
  label_ar: string;
}

interface Props {
  visible: boolean;
  employeeId: string | null;
  employeeName: string;
  onClose: () => void;
}

/**
 * The employee-centric mirror of ServiceEmployeesModal (which assigns staff
 * per-service): here the founder picks one supervisor and toggles which
 * category services they're responsible for, across every category at
 * once. Both write the same service_employees bridge table — an empty
 * selection for a given service still means "unrestricted" (any employee
 * may take it), consistent with the per-service screen.
 */
export function EmployeeServicesModal({ visible, employeeId, employeeName, onClose }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!employeeId) { setLoading(false); return; }
    setLoading(true);
    setError('');

    const [catRes, svcRes, mapRes] = await Promise.all([
      supabase.from('categories').select('key, label_ar').order('sort_order'),
      supabase.from('category_services').select('id, label_ar, category_key').eq('is_active', true).order('category_key').order('sort_order'),
      supabase.from('service_employees').select('service_id').eq('employee_id', employeeId),
    ]);

    if (catRes.error) setError(catRes.error.message);
    setCategories((catRes.data ?? []) as CategoryRow[]);
    setServices((svcRes.data ?? []) as ServiceRow[]);

    const assigned = new Set(
      ((mapRes.data ?? []) as { service_id: string }[]).map((r) => r.service_id),
    );
    setSelected(new Set(assigned));
    setInitial(assigned);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!employeeId) return;
    setSaving(true);
    setError('');

    const toAdd = [...selected].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !selected.has(id));

    if (toAdd.length) {
      const { error: err } = await supabase
        .from('service_employees')
        .insert(toAdd.map((service_id) => ({ service_id, employee_id: employeeId })));
      if (err) { setError(err.message); setSaving(false); return; }
    }
    if (toRemove.length) {
      const { error: err } = await supabase
        .from('service_employees')
        .delete()
        .eq('employee_id', employeeId)
        .in('service_id', toRemove);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          <Text style={s.title} numberOfLines={2}>خانات المشرف: {employeeName}</Text>
          <Text style={s.hint}>
            {selected.size === 0
              ? 'لم تُسنَد أي خانة بعد — لن تصل هذا المشرف طلبات إلا عبر "الخدمات النشطة" بملفه.'
              : `مسندة: ${selected.size} خدمة`}
          </Text>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {loading ? (
            <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const catServices = services.filter((svc) => svc.category_key === cat.key);
                if (catServices.length === 0) return null;
                return (
                  <View key={cat.key}>
                    <Text style={s.catHeader}>{cat.label_ar}</Text>
                    {catServices.map((svc) => {
                      const on = selected.has(svc.id);
                      return (
                        <Pressable
                          key={svc.id}
                          onPress={() => toggle(svc.id)}
                          style={({ pressed }) => [s.row, pressed && { opacity: 0.75 }]}
                        >
                          <View style={[s.box, on && s.boxOn]}>{on && <Text style={s.tick}>✓</Text>}</View>
                          <Text style={s.name} numberOfLines={1}>{svc.label_ar}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={s.actions}>
            <Pressable onPress={onClose} style={[s.btn, s.cancelBtn]}>
              <Text style={s.cancelText}>إلغاء</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} style={[s.btn, s.saveBtn, saving && { opacity: 0.6 }]}>
              {saving ? <ActivityIndicator color="#0d1117" size="small" /> : <Text style={s.saveText}>حفظ</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    height: '80%', backgroundColor: COLORS.bg, padding: 14,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderColor: COLORS.goldBorder,
  },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold, textAlign: 'right' },
  hint: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.red, textAlign: 'right', marginBottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catHeader: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right', marginTop: 10, marginBottom: 4 },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.cardBorder,
  },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.white40,
    alignItems: 'center', justifyContent: 'center',
  },
  boxOn: { borderColor: COLORS.gold, backgroundColor: COLORS.gold },
  tick: { fontSize: 13, color: '#0d1117', fontFamily: FONTS.bold },
  name: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right', flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  cancelText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white70 },
  saveBtn: { backgroundColor: COLORS.gold },
  saveText: { fontFamily: FONTS.bold, fontSize: 14, color: '#0d1117' },
});
