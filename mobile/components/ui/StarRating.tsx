import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/theme';

interface Props {
  value: number;
  onChange?: (stars: number) => void;
  size?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, size = 28, readonly = false }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={readonly || !onChange}
          onPress={() => onChange?.(n)}
          hitSlop={4}
        >
          <Text style={{ fontSize: size, color: n <= value ? COLORS.gold : 'rgba(255,255,255,0.2)' }}>
            {n <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', gap: 4 },
});
