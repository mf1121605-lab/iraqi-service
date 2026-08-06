import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, hasFounderAccess } from '@/hooks/useAuth';
import { useUiOverrides } from '@/hooks/useUiOverrides';
import { COLORS } from '@/constants/theme';

// Floating toggle, founder/co_admin only — flips the whole app into
// "design mode": every ThemedText/ThemedBox becomes tappable to open the
// per-element style editor instead of its normal action.
export function DesignModeToggle() {
  const { profile } = useAuth();
  const { designMode, setDesignMode } = useUiOverrides();
  const insets = useSafeAreaInsets();

  if (!hasFounderAccess(profile)) return null;

  return (
    <Pressable
      onPress={() => setDesignMode(!designMode)}
      style={[
        styles.btn,
        { bottom: insets.bottom + 90 },
        designMode && styles.btnActive,
      ]}
    >
      <Text style={styles.icon}>{designMode ? '✕' : '🎨'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    end: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#161b22',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  btnActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  icon: { fontSize: 20 },
});
