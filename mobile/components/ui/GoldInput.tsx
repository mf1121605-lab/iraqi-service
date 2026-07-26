import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function GoldInput({ label, error, secureToggle, ...props }: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error && styles.inputError]}>
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? !revealed : props.secureTextEntry}
          style={[styles.input, props.style]}
          placeholderTextColor={COLORS.white40}
          textAlign="right"
          writingDirection="rtl"
        />
        {secureToggle && (
          <Pressable onPress={() => setRevealed((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{revealed ? '🙈' : '👁️'}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white70,
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.white20,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputError: {
    borderColor: COLORS.red,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.white,
    paddingVertical: 12,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'right',
  },
});
