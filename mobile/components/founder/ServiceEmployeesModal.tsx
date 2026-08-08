import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Avatar } from '@/components/chat/Avatar';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Employee {
  id: string;
  given_name: string | null;
  family_name: string | null;
  avatar_key: string | null;
  specialization: string | null;
}

interface Props {
  visible: boolean;
  serviceId: string | null;
  serviceLabel: string;
  onClose: () => void;
}

/**
 * Assigns staff to one service. Selection is diffed against what's already
 * stored and written as one insert plus one delete, rather than wiping the
 * mapping and re-inserting it — a wipe would briefly leave the service with
 * nobody assigned, which the customer app reads as "unrestricted".
 *
 * An empty selection is meaningful: it means "no restriction", and every
 * service created before service_employees existed is in exactly that state.
 */
export function ServiceEmployeesModal({ visible, serviceId, serviceLabel, onClose }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!serviceId) { setLoading(false); return; }
    setLoading(true);
    setError('');

    const [empRes, mapRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, given_name, family_name, avatar_key, specialization')
        .eq('role', 'employee')
        .eq('account_status', 'active')
        .order('given_name'),
      supabase.from('service_employees').select('employee_id').eq('service_id', serviceId),
    ]);

    if (empRes.error) setError(empRes.error.message);
    setEmployees((empRes.data ?? []) as Employee[]);

    const assigned = new Set(
      ((mapRes.data ?? []) as { employee_id: string }[]).map((r) => r.employee_id),
    );
    setSelected(new Set(assigned));
    setInitial(assigned);
    setLoading(false);
  }, [serviceId]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const renderEmployee: ListRenderItem<Employee> = useCallback(({ item }) => {
    const name = [item.given_name, item.family_name].filter(Boolean).join(' ') || 'موظف';
    const on = selected.has(item.id);
    return (
      <Pressable onPress={() => toggle(item.id)} style={({ pressed }) => [s.row, pressed && { opacity: 0.75 }]}>
        <View style={[s.box, on && s.boxOn]}>{on && <Text style={s.tick}>✓</Text>}</View>
        <View style={{ flex: 1 }}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          {item.specialization ? <Text style={s.spec} numberOfLines={1}>{item.specialization}</Text> : null}
        </View>
        <Avatar avatarKey={item.avatar_key} name={name} seed={item.id} size={38} />
      </Pressable>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const allSelected = employees.length > 0 && employees.every((e) => selected.has(e.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(employees.map((e) => e.id)));
  }

  async function save() {
    if (!serviceId) return;
    setSaving(true);
    setError('');

    const toAdd = [...selected].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !selected.has(id));

    if (toAdd.length) {
      const { error: err } = await supabase
        .from('service_employees')
        .insert(toAdd.map((employee_id) => ({ service_id: serviceId, employee_id })));
      if (err) { setError(err.message); setSaving(false); return; }
    }
    if (toRemove.length) {
      const { error: err } = await supabase
        .from('service_employees')
        .delete()
        .eq('service_id', serviceId)
        .in('employee_id', toRemove);
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
          <Text style={s.title} numberOfLines={2}>موظفو خدمة: {serviceLabel}</Text>
          <Text style={s.hint}>
            {selected.size === 0
              ? 'لم يُحدَّد أحد — الخدمة متاحة لكل موظفي القطاع (بدون تقييد).'
              : `محدَّد: ${selected.size} من ${employees.length}`}
          </Text>

          <Pressable onPress={toggleAll} style={s.selectAllBtn}>
            <Text style={s.selectAllText}>{allSelected ? '✕ إلغاء تحديد الكل' : '✓ تحديد الكل'}</Text>
          </Pressable>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {loading ? (
            <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
          ) : (
            <FlashList
              data={employees}
              keyExtractor={(e) => e.id}
              estimatedItemSize={60}
              ListEmptyComponent={<Text style={s.empty}>لا يوجد موظفون نشطون</Text>}
              renderItem={renderEmployee}
            />
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
  selectAllBtn: {
    alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.goldBorder, backgroundColor: 'rgba(230,171,44,0.10)',
  },
  selectAllText: { fontFamily: FONTS.bold, fontSize: 12, color: COLORS.gold },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.red, textAlign: 'right', marginBottom: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 30 },
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
  name: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white, textAlign: 'right' },
  spec: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  cancelBtn: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder },
  cancelText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white70 },
  saveBtn: { backgroundColor: COLORS.gold },
  saveText: { fontFamily: FONTS.bold, fontSize: 14, color: '#0d1117' },
});
