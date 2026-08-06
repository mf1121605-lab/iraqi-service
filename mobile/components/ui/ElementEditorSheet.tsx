import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useUiOverrides } from '@/hooks/useUiOverrides';
import { COLORS, FONTS, FONT_FAMILIES, RADIUS } from '@/constants/theme';

const SWATCHES = [
  '#ffffff', '#0d1117', '#161b22', '#e6ab2c', '#fcd34d',
  '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#f97316',
  '#94a3b8', '#000000',
];

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 40;
const DEFAULT_FONT_SIZE = 14;

// Founder-only "design mode" editor — opens over any ThemedText/ThemedBox
// the founder taps while design mode is active. No color-wheel / slider
// dependency on purpose (keeps native deps unchanged, avoids the exact
// class of native-crash risk this app already hit once this session):
// swatches + a free-text hex field cover "any color", and +/- steppers
// cover font size without needing @react-native-community/slider.
export function ElementEditorSheet() {
  const { editorTarget, closeEditor, overrides, saveOverride, resetOverride } = useUiOverrides();

  const [hexInput, setHexInput] = useState('');

  useEffect(() => {
    setHexInput('');
  }, [editorTarget?.id]);

  if (!editorTarget) return null;
  const { id, kind, label, hint } = editorTarget;
  const override = overrides[id];

  const currentColor = override?.font_color ?? hint.color ?? COLORS.white;
  const currentBg = override?.bg_color ?? hint.bgColor ?? COLORS.card;
  const currentSize = override?.font_size ?? hint.fontSize ?? DEFAULT_FONT_SIZE;
  const currentFamily = override?.font_family ?? 'cairo';

  function applyHex(target: 'font_color' | 'bg_color') {
    const cleaned = hexInput.trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(cleaned)) return;
    saveOverride(id, { [target]: cleaned } as any);
    setHexInput('');
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeEditor}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeEditor} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <Pressable onPress={closeEditor} hitSlop={10}>
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {kind === 'text' && (
              <>
                <Text style={styles.sectionLabel}>لون الخط</Text>
                <View style={styles.swatchRow}>
                  {SWATCHES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => saveOverride(id, { font_color: c })}
                      style={[styles.swatch, { backgroundColor: c }, currentColor === c && styles.swatchActive]}
                    />
                  ))}
                </View>
                <View style={styles.hexRow}>
                  <TextInput
                    value={hexInput}
                    onChangeText={setHexInput}
                    placeholder="#RRGGBB"
                    placeholderTextColor={COLORS.white40}
                    style={styles.hexInput}
                    autoCapitalize="none"
                  />
                  <Pressable style={styles.hexBtn} onPress={() => applyHex('font_color')}>
                    <Text style={styles.hexBtnText}>تطبيق</Text>
                  </Pressable>
                </View>

                <Text style={styles.sectionLabel}>حجم الخط ({Math.round(currentSize)})</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() => saveOverride(id, { font_size: Math.max(MIN_FONT_SIZE, Math.round(currentSize) - 1) })}
                  >
                    <Text style={styles.stepperText}>–</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{Math.round(currentSize)}</Text>
                  <Pressable
                    style={styles.stepperBtn}
                    onPress={() => saveOverride(id, { font_size: Math.min(MAX_FONT_SIZE, Math.round(currentSize) + 1) })}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>

                <Text style={styles.sectionLabel}>نوع الخط</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fontRow}>
                  {FONT_FAMILIES.map((f) => (
                    <Pressable
                      key={f.key}
                      onPress={() => saveOverride(id, { font_family: f.key })}
                      style={[styles.fontChip, currentFamily === f.key && styles.fontChipActive]}
                    >
                      <Text style={[styles.fontChipText, { fontFamily: f.regular }]}>{f.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {kind === 'box' && (
              <>
                <Text style={styles.sectionLabel}>لون الخلفية</Text>
                <View style={styles.swatchRow}>
                  {SWATCHES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => saveOverride(id, { bg_color: c })}
                      style={[styles.swatch, { backgroundColor: c }, currentBg === c && styles.swatchActive]}
                    />
                  ))}
                </View>
                <View style={styles.hexRow}>
                  <TextInput
                    value={hexInput}
                    onChangeText={setHexInput}
                    placeholder="#RRGGBB"
                    placeholderTextColor={COLORS.white40}
                    style={styles.hexInput}
                    autoCapitalize="none"
                  />
                  <Pressable style={styles.hexBtn} onPress={() => applyHex('bg_color')}>
                    <Text style={styles.hexBtnText}>تطبيق</Text>
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>

          <Pressable style={styles.resetBtn} onPress={() => resetOverride(id)}>
            <Text style={styles.resetBtnText}>إعادة للوضع الافتراضي</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.25)',
    padding: 18,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  closeIcon: { fontSize: 18, color: COLORS.white70 },
  sectionLabel: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold, marginTop: 14, marginBottom: 8 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  swatchActive: { borderWidth: 3, borderColor: COLORS.gold },
  hexRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  hexInput: {
    flex: 1, backgroundColor: '#0d1117', borderRadius: RADIUS.sm, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', color: COLORS.white, paddingHorizontal: 12, paddingVertical: 8,
    fontFamily: FONTS.regular, fontSize: 13, textAlign: 'left',
  },
  hexBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.sm, paddingHorizontal: 16, justifyContent: 'center' },
  hexBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#0d1117' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#0d1117',
    borderWidth: 1, borderColor: 'rgba(230,171,44,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  stepperText: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.gold },
  stepperValue: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white, minWidth: 30, textAlign: 'center' },
  fontRow: { flexDirection: 'row' },
  fontChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.sm, marginEnd: 8,
    backgroundColor: '#0d1117', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  fontChipActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(230,171,44,0.12)' },
  fontChipText: { fontSize: 14, color: COLORS.white },
  resetBtn: {
    marginTop: 16, alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'rgba(239,68,68,0.1)',
  },
  resetBtnText: { fontFamily: FONTS.bold, fontSize: 13, color: '#ef4444' },
});
