/**
 * GoldInput — matches the web's .dark .input-cinematic:
 *   border: rgba(245,158,11,0.18), bg: rgba(22,27,34,0.80)
 *   focus: border gold70%, bg rgba(22,27,34,0.95),
 *          shadow: 0 0 0 3px rgba(245,158,11,0.20) + 0 0 16px -4px rgba(245,158,11,0.25)
 */
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
  const [focused,  setFocused]  = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? !revealed : props.secureTextEntry}
          style={[styles.input, props.style]}
          placeholderTextColor={COLORS.white40}
          textAlign="right"
          onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
        />
        {secureToggle && (
          <Pressable onPress={() => setRevealed((v) => !v)} style={styles.eyeBtn} hitSlop={8}>
            <Text style={styles.eyeIcon}>{revealed ? '🙈' : '👁️'}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
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
    borderColor: 'rgba(245,158,11,0.18)',   // .dark .input-cinematic border
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(22,27,34,0.80)', // .dark .input-cinematic bg
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: 'rgba(245,158,11,0.70)',
    backgroundColor: 'rgba(22,27,34,0.95)',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  inputError: {
    borderColor: COLORS.red,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.white,
    paddingVertical: 13,
    textAlignVertical: 'center',
  },
  eyeBtn:  { paddingHorizontal: 4, paddingVertical: 4 },
  eyeIcon: { fontSize: 16 },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.red,
    textAlign: 'right',
  },
});
