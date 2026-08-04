import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function EmptyState({ emoji, title, subtitle, retryLabel, onRetry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {onRetry && (
        <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.retryText}>{retryLabel ?? 'إعادة المحاولة'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 52,
    paddingHorizontal: 24,
    gap: 10,
    backgroundColor: '#161b22',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.12)',
  },
  emoji: { fontSize: 52 },
  title: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.white },
  subtitle: { fontFamily: FONTS.regular, fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 6,
    backgroundColor: 'rgba(230,171,44,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.35)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  retryText: { fontFamily: FONTS.bold, fontSize: 13, color: COLORS.gold },
});
