import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'image';

const FIELD_TYPES: { key: FieldType; label: string }[] = [
  { key: 'text', label: 'نص قصير' },
  { key: 'textarea', label: 'نص طويل' },
  { key: 'number', label: 'رقم' },
  { key: 'select', label: 'اختيار من قائمة' },
  { key: 'checkbox', label: 'نعم/لا' },
  { key: 'date', label: 'تاريخ' },
  { key: 'image', label: 'صورة' },
];

interface DynamicFieldRow {
  id: string;
  field_key: string;
  label_ar: string;
  field_type: FieldType;
  options: { value: string; label_ar: string }[] | null;
  is_required: boolean;
  sort_order: number;
}

interface Props {
  visible: boolean;
  serviceId: string | null;
  serviceLabel: string;
  onClose: () => void;
}

/**
 * The founder's editor for a service's "interactive third level" — the
 * sub-questions that pop up on the customer's request form only when this
 * specific service is chosen (e.g. "تقديم ذوي الاحتياجات الخاصة" asking for
 * disability type + supporting document number). Writes land directly, one
 * field at a time — same immediate-write convention as category-services.tsx
 * itself, no separate diff/save step.
 */
export function ServiceFieldsModal({ visible, serviceId, serviceLabel, onClose }: Props) {
  const [fields, setFields] = useState<DynamicFieldRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [labelAr, setLabelAr] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(false);

  const load = useCallback(async () => {
    if (!serviceId) { setLoading(false); return; }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase
      .from('service_dynamic_fields')
      .select('id, field_key, label_ar, field_type, options, is_required, sort_order')
      .eq('service_id', serviceId)
      .order('sort_order');
    if (err) setError(err.message);
    setFields((data ?? []) as DynamicFieldRow[]);
    setLoading(false);
  }, [serviceId]);

  useEffect(() => {
    if (visible) {
      load();
      setLabelAr('');
      setFieldType('text');
      setOptionsText('');
      setRequired(false);
    }
  }, [visible, load]);

  async function handleAdd() {
    if (!serviceId) return;
    setError('');
    if (!labelAr.trim()) { setError('نص السؤال مطلوب'); return; }

    let options: { value: string; label_ar: string }[] | null = null;
    if (fieldType === 'select') {
      const items = optionsText.split(',').map((s) => s.trim()).filter(Boolean);
      if (items.length < 2) { setError('اكتب خيارين على الأقل مفصولين بفاصلة'); return; }
      options = items.map((label) => ({ value: label, label_ar: label }));
    }

    setSaving(true);
    const { error: err } = await supabase.from('service_dynamic_fields').insert({
      service_id: serviceId,
      field_key: `f_${Date.now().toString(36)}${Math.round(Math.random() * 1e4).toString(36)}`,
      label_ar: labelAr.trim(),
      field_type: fieldType,
      options,
      is_required: required,
      sort_order: fields.length,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    setLabelAr('');
    setOptionsText('');
    setRequired(false);
    load();
  }

  function confirmDelete(field: DynamicFieldRow) {
    Alert.alert('حذف السؤال', `هل تريد حذف "${field.label_ar}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('service_dynamic_fields').delete().eq('id', field.id);
          load();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          <Text style={s.title} numberOfLines={2}>الأسئلة الفرعية: {serviceLabel}</Text>
          <Text style={s.hint}>تظهر هذي الأسئلة للزبون تلقائياً عند اختياره هذي الخدمة تحديداً.</Text>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {loading ? (
              <View style={s.center}><ActivityIndicator color={COLORS.gold} size="large" /></View>
            ) : (
              <>
                {fields.length === 0 ? (
                  <Text style={s.empty}>لا توجد أسئلة فرعية بعد لهذي الخدمة</Text>
                ) : (
                  fields.map((f) => (
                    <View key={f.id} style={s.row}>
                      <Pressable onPress={() => confirmDelete(f)} style={s.deleteBtn} hitSlop={8}>
                        <Text style={s.deleteBtnText}>✕</Text>
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rowLabel} numberOfLines={1}>
                          {f.label_ar}{f.is_required ? ' *' : ''}
                        </Text>
                        <Text style={s.rowType}>{FIELD_TYPES.find((t) => t.key === f.field_type)?.label ?? f.field_type}</Text>
                      </View>
                    </View>
                  ))
                )}

                <View style={s.addCard}>
                  <Text style={s.addTitle}>+ إضافة سؤال جديد</Text>
                  <TextInput
                    value={labelAr}
                    onChangeText={setLabelAr}
                    placeholder="نص السؤال — مثال: نوع الإعاقة"
                    placeholderTextColor={COLORS.white40}
                    style={s.input}
                    textAlign="right"
                  />

                  <View style={s.typeRow}>
                    {FIELD_TYPES.map((t) => (
                      <Pressable
                        key={t.key}
                        onPress={() => setFieldType(t.key)}
                        style={[s.typeChip, fieldType === t.key && s.typeChipActive]}
                      >
                        <Text style={[s.typeChipText, fieldType === t.key && s.typeChipTextActive]}>{t.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {fieldType === 'select' && (
                    <TextInput
                      value={optionsText}
                      onChangeText={setOptionsText}
                      placeholder="الخيارات مفصولة بفاصلة — مثال: بصرية، سمعية، حركية"
                      placeholderTextColor={COLORS.white40}
                      style={s.input}
                      textAlign="right"
                    />
                  )}

                  <View style={s.requiredRow}>
                    <Switch
                      value={required}
                      onValueChange={setRequired}
                      thumbColor={required ? COLORS.gold : '#888'}
                      trackColor={{ true: 'rgba(230,171,44,0.4)', false: 'rgba(255,255,255,0.1)' }}
                    />
                    <Text style={s.requiredLabel}>سؤال إجباري</Text>
                  </View>

                  <Pressable onPress={handleAdd} disabled={saving} style={[s.addBtn, saving && { opacity: 0.6 }]}>
                    <Text style={s.addBtnText}>{saving ? '...' : '+ إضافة'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>

          <Pressable onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>إغلاق</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    height: '85%', backgroundColor: COLORS.bg, padding: 14,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1, borderColor: COLORS.goldBorder,
  },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.gold, textAlign: 'right' },
  hint: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  error: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.red, textAlign: 'right', marginBottom: 6 },
  center: { paddingVertical: 30, alignItems: 'center' },
  empty: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 16, marginBottom: 10 },

  row: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.sm, padding: 10, marginBottom: 8,
  },
  rowLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.white, textAlign: 'right' },
  rowType: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.gold, textAlign: 'right', marginTop: 2 },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 14, color: '#ef4444' },

  addCard: { backgroundColor: 'rgba(230,171,44,0.06)', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, padding: 12, gap: 10, marginTop: 8 },
  addTitle: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, textAlign: 'right' },
  input: { backgroundColor: '#0d1117', borderWidth: 1, borderColor: COLORS.goldBorder, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontFamily: FONTS.regular, fontSize: 13 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  typeChipActive: { backgroundColor: COLORS.goldDim, borderColor: COLORS.goldBorder },
  typeChipText: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.muted },
  typeChipTextActive: { color: COLORS.gold, fontFamily: FONTS.bold },
  requiredRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  requiredLabel: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.white },
  addBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: 'center' },
  addBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#0d1117' },

  closeBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  closeText: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.white70 },
});
