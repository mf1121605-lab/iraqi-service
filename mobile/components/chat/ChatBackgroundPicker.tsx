import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CHAT_BG_THEMES, ChatBgTheme } from '@/utils/chatBackgroundPrefs';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  visible: boolean;
  current: ChatBgTheme;
  onSelect: (theme: ChatBgTheme) => void;
  onClose: () => void;
}

export function ChatBackgroundPicker({ visible, current, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>خلفية المحادثة</Text>
          <View style={styles.grid}>
            {(Object.keys(CHAT_BG_THEMES) as ChatBgTheme[]).map((key) => {
              const def = CHAT_BG_THEMES[key];
              const isCurrent = key === current;
              return (
                <Pressable key={key} style={styles.item} onPress={() => onSelect(key)}>
                  <View style={[styles.swatch, isCurrent && styles.swatchSelected]}>
                    {def.colors ? (
                      <LinearGradient
                        colors={[def.colors[0].replace(/[\d.]+\)$/, '1)'), def.colors[1].replace(/[\d.]+\)$/, '1)')]}
                        style={StyleSheet.absoluteFill}
                      />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, styles.noneSwatch]} />
                    )}
                    {isCurrent && <Text style={styles.check}>✓</Text>}
                  </View>
                  <Text style={styles.label}>{def.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: RADIUS.lg,
    padding: 20,
    gap: 16,
    width: '84%',
  },
  title: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.gold, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },
  item: { alignItems: 'center', gap: 6, width: 64 },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: { borderColor: COLORS.gold },
  noneSwatch: { backgroundColor: '#0d1117' },
  check: { fontFamily: FONTS.bold, fontSize: 18, color: '#fff' },
  label: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white70 },
});
