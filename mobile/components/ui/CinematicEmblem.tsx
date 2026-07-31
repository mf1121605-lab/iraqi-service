import { Image, StyleSheet, View } from 'react-native';

// Circular gold-ringed logo badge — matches the web's `.cinematic-emblem` used
// on login/register/forgot-password cards.
export function CinematicEmblem({ size = 100 }: { size?: number }) {
  const mid = size * 0.82;
  const core = size * 0.68;
  const logo = core * 0.72;

  return (
    <View style={[styles.outer, { width: size, height: size, borderRadius: size / 2 }]}>
      <View style={[styles.mid, { width: mid, height: mid, borderRadius: mid / 2 }]} />
      <View style={[styles.core, { width: core, height: core, borderRadius: core / 2 }]}>
        <Image
          source={require('@/assets/icon.png')}
          style={{ width: logo, height: logo, borderRadius: logo / 2 }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e6ab2c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 10,
  },
  mid: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.35)',
    backgroundColor: 'transparent',
  },
  core: {
    backgroundColor: 'rgba(230,171,44,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
