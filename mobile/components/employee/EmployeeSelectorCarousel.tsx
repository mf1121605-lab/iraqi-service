import { useEffect } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '@/components/chat/Avatar';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';

export type EmployeeCandidate = {
  id: string;
  given_name: string;
  family_name: string;
  avatar_key: string | null;
  specialization: string | null;
  is_verified: boolean;
  is_online?: boolean;
};

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = 198;
const CARD_H = 304;
const CARD_GAP = 16;
const SNAP = CARD_W + CARD_GAP;
const SIDE_INSET = (SCREEN_W - CARD_W) / 2;

interface Props {
  candidates: EmployeeCandidate[];
  selectedId?: string | null;
  confirmingId?: string | null;
  onSelect?: (candidate: EmployeeCandidate) => void;
  // Passive "waiting for an employee to respond" mode: no tap-to-pick,
  // the strip auto-advances on its own so it reads as a live motion-
  // graphics grid of who's currently available, not a picker.
  autoScroll?: boolean;
}

// Horizontal RTL carousel: the whole scroller is mirrored (scaleX: -1) so the
// first candidate sits on the right edge and a natural right-to-left swipe
// advances forward — each card un-mirrors itself so its content renders
// normally. All scale/opacity/glow driven straight off the scroll offset on
// the UI thread (useAnimatedScrollHandler + interpolate), so it stays at
// 60fps with zero JS-thread round trips per frame.
export function EmployeeSelectorCarousel({ candidates, selectedId = null, confirmingId = null, onSelect, autoScroll = false }: Props) {
  const scrollX = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  useEffect(() => {
    if (!autoScroll || candidates.length < 2) return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % candidates.length;
      runOnUI(() => { 'worklet'; scrollTo(scrollRef, i * SNAP, 0, true); })();
    }, 2600);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScroll, candidates.length]);

  return (
    <View style={styles.wrap}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        style={styles.flip}
        onScroll={onScroll}
        scrollEventThrottle={16}
        snapToInterval={SNAP}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!autoScroll}
        contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
      >
        {candidates.map((candidate, index) => (
          <CarouselCard
            key={candidate.id}
            candidate={candidate}
            index={index}
            scrollX={scrollX}
            isSelected={selectedId === candidate.id}
            isConfirming={confirmingId === candidate.id}
            disabled={!!confirmingId || !onSelect}
            onPress={() => onSelect?.(candidate)}
          />
        ))}
      </Animated.ScrollView>

      {candidates.length > 1 && (
        <View style={styles.dots}>
          {candidates.map((candidate, index) => (
            <Dot key={candidate.id} index={index} scrollX={scrollX} />
          ))}
        </View>
      )}
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: Animated.SharedValue<number> }) {
  const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];
  const dotStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [1, 1.6, 1], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });
  return <Animated.View style={[styles.dot, dotStyle]} />;
}

function CarouselCard({
  candidate,
  index,
  scrollX,
  isSelected,
  isConfirming,
  disabled,
  onPress,
}: {
  candidate: EmployeeCandidate;
  index: number;
  scrollX: Animated.SharedValue<number>;
  isSelected: boolean;
  isConfirming: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const inputRange = [(index - 1) * SNAP, index * SNAP, (index + 1) * SNAP];

  // Motion-graphics entrance: each card flips in right-to-left (rotateY
  // 90deg -> 0deg), staggered by index, on first mount.
  const flipRotate = useSharedValue(90);
  const flipOpacity = useSharedValue(0);
  useEffect(() => {
    flipRotate.value = withDelay(index * 90, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
    flipOpacity.value = withDelay(index * 90, withTiming(1, { duration: 400 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [0.84, 1, 0.84], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [16, 0, 16], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    // Un-mirror this card's content (parent scroller is scaleX: -1), then
    // apply the entrance flip in that un-mirrored space.
    return {
      transform: [
        { scaleX: -1 },
        { perspective: 900 },
        { rotateY: `${flipRotate.value}deg` },
        { scale },
        { translateY },
      ],
      opacity: opacity * flipOpacity.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const glow = interpolate(scrollX.value, inputRange, [0.18, 0.95, 0.18], Extrapolation.CLAMP);
    return { shadowOpacity: glow, elevation: interpolate(glow, [0.18, 0.95], [3, 18]) };
  });

  const checkScale = useSharedValue(isSelected ? 1 : 0);
  useEffect(() => {
    checkScale.value = isSelected
      ? withSequence(withTiming(1.35, { duration: 150 }), withSpring(1, { damping: 9, stiffness: 220 }))
      : withTiming(0, { duration: 140 });
  }, [isSelected, checkScale]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const fullName = `${candidate.given_name ?? ''} ${candidate.family_name ?? ''}`.trim() || 'موظف';

  return (
    <Animated.View style={[styles.cardShadowWrap, glowStyle, cardStyle]}>
      <Pressable
        disabled={disabled}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onPress();
        }}
      >
        <View style={[styles.card, isSelected && styles.cardSelected]}>
          {/* Glass base — whatever animates behind (ScreenBg gradient/particles) shows through */}
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(34,27,15,0.55)', 'rgba(13,10,6,0.55)', 'rgba(5,4,3,0.60)']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Glossy top reflection */}
          <LinearGradient
            colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
            style={styles.glossOverlay}
          />
          {/* Lit top edge */}
          <View style={styles.topShine} />

          <View style={styles.avatarWrap}>
            <Avatar avatarKey={candidate.avatar_key} name={candidate.given_name} seed={candidate.id} size={82} />
          </View>

          <View style={styles.body}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, {
                backgroundColor: candidate.is_online ? '#22c55e' : '#ef4444',
                shadowColor: candidate.is_online ? '#22c55e' : '#ef4444',
              }]} />
              <Text style={[styles.statusText, { color: candidate.is_online ? '#22c55e' : '#ef4444' }]}>
                {candidate.is_online ? 'نشط الآن' : 'غير نشط'}
              </Text>
            </View>

            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {fullName}
              </Text>
              {candidate.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedGlyph}>✓</Text>
                </View>
              )}
            </View>

            {candidate.specialization ? (
              <Text style={styles.specialization} numberOfLines={1}>
                🎓 {candidate.specialization}
              </Text>
            ) : null}
          </View>

          {isConfirming && (
            <View style={styles.confirmOverlay}>
              <ActivityIndicator color={COLORS.gold} />
            </View>
          )}

          <Animated.View style={[styles.checkBadge, checkStyle]} pointerEvents="none">
            <Text style={styles.checkGlyph}>✓</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flip: { transform: [{ scaleX: -1 }] },

  cardShadowWrap: {
    width: CARD_W,
    marginHorizontal: CARD_GAP / 2,
    borderRadius: RADIUS.lg,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.35)',
    alignItems: 'center',
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  glossOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.45,
  },
  topShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(230,171,44,0.8)',
  },

  avatarWrap: {
    marginTop: 26,
    padding: 3,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(230,171,44,0.5)',
  },

  body: { flex: 1, width: '100%', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14, gap: 5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, color: '#facc15' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  name: { fontFamily: FONTS.bold, fontSize: 15, color: COLORS.white, maxWidth: CARD_W - 60 },
  verifiedBadge: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(59,130,246,0.2)',
    borderWidth: 1,
    borderColor: '#60a5fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedGlyph: { fontSize: 9, color: '#60a5fa', fontFamily: FONTS.bold },

  specialization: { fontFamily: FONTS.regular, fontSize: 11, color: COLORS.white50, maxWidth: '100%' },

  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  checkGlyph: { fontFamily: FONTS.bold, fontSize: 16, color: '#fff' },

  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },
});
