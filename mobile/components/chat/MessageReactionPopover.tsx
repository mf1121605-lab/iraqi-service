import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/constants/theme';

export const MESSAGE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface Props {
  align: 'start' | 'end';
  onPick: (emoji: string) => void;
  onReply?: () => void;
}

// Floating emoji row shown above a message bubble on long-press / double-tap.
// An optional trailing "↩" button lets the same gesture start a reply.
export function MessageReactionPopover({ align, onPick, onReply }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(160).easing(Easing.out(Easing.back(1.4)))}
      style={[styles.wrap, align === 'start' ? { left: 8 } : { right: 8 }]}
    >
      <View style={styles.popover}>
        {MESSAGE_REACTIONS.map((emoji) => (
          <Pressable
            key={emoji}
            hitSlop={4}
            style={styles.emojiBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onPick(emoji); }}
          >
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
        {onReply && (
          <>
            <View style={styles.divider} />
            <Pressable
              hitSlop={4}
              style={styles.emojiBtn}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onReply(); }}
            >
              <Text style={styles.replyIcon}>↩</Text>
            </Pressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: '100%', marginBottom: 6, zIndex: 30 },
  popover: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  emojiBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 21 },
  divider: { width: 1, height: 22, backgroundColor: COLORS.goldBorder, marginHorizontal: 2, alignSelf: 'center' },
  replyIcon: { fontSize: 18, color: COLORS.gold },
});
