import { Text, TextProps, TextStyle, View, ViewProps, ViewStyle, Pressable, StyleSheet } from 'react-native';
import { useElementOverride, useUiOverrides } from '@/hooks/useUiOverrides';
import { FONT_FAMILIES } from '@/constants/theme';

// ThemedText / ThemedBox — drop-in replacements for <Text>/<View> that read
// a per-element style override (font color/size/family, or box background
// color) from the founder's design-mode table. Every themeable element
// needs a stable, unique `id` (e.g. "login.title") — that id is both the
// database key and what the founder sees while editing. When design mode
// is off these render exactly like a plain Text/View with zero overhead
// beyond one object lookup.

interface ThemedTextProps extends TextProps {
  id: string;
  label?: string;
  bold?: boolean;
}

export function ThemedText({ id, label, bold, style, children, ...rest }: ThemedTextProps) {
  const override = useElementOverride(id);
  const { designMode, openEditor, editorTarget } = useUiOverrides();

  const overrideStyle: TextStyle = {};
  if (override?.font_color) overrideStyle.color = override.font_color;
  if (override?.font_size) overrideStyle.fontSize = override.font_size;
  if (override?.font_family) {
    const family = FONT_FAMILIES.find((f) => f.key === override.font_family);
    if (family) overrideStyle.fontFamily = bold ? family.bold : family.regular;
  }

  const isSelected = editorTarget?.id === id;
  const content = (
    <Text
      style={[style, overrideStyle, designMode && styles.designOutline, isSelected && styles.designSelected]}
      {...rest}
    >
      {children}
    </Text>
  );

  if (!designMode) return content;

  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const hint = { color: flat?.color as string | undefined, fontSize: flat?.fontSize };

  return (
    <Pressable onPress={() => openEditor(id, 'text', label ?? id, hint)} hitSlop={4}>
      {content}
    </Pressable>
  );
}

interface ThemedBoxProps extends ViewProps {
  id: string;
  label?: string;
}

export function ThemedBox({ id, label, style, children, ...rest }: ThemedBoxProps) {
  const override = useElementOverride(id);
  const { designMode, openEditor, editorTarget } = useUiOverrides();

  const overrideStyle: ViewStyle = {};
  if (override?.bg_color) overrideStyle.backgroundColor = override.bg_color;

  const isSelected = editorTarget?.id === id;

  if (!designMode) {
    return (
      <View style={[style, overrideStyle]} {...rest}>
        {children}
      </View>
    );
  }

  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const hint = { bgColor: flat?.backgroundColor as string | undefined };

  return (
    <Pressable onPress={() => openEditor(id, 'box', label ?? id, hint)}>
      <View style={[style, overrideStyle, styles.designOutline, isSelected && styles.designSelected]} {...rest}>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  designOutline: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(59,130,246,0.6)',
  },
  designSelected: {
    borderColor: '#22c55e',
    borderStyle: 'solid',
  },
});
