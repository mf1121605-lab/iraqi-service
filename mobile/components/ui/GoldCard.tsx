import { StyleSheet, View, ViewProps } from 'react-native';
import { COLORS, RADIUS } from '@/constants/theme';

export function GoldCard({ children, style, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
});
