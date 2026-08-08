import { memo, useEffect, useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAmbientMusic } from '@/hooks/useAmbientMusic';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { Avatar } from './Avatar';
import { TwemojiSticker, hasTwemojiSticker } from './TwemojiSticker';
import { PAYMENT_METHOD_COLORS, PAYMENT_METHOD_LABELS } from '@/utils/paymentMethods';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface ReactionSummary { emoji: string; count: number; mine: boolean }

interface Props {
  body: string;
  isMine: boolean;
  senderName?: string;
  senderAvatarKey?: string | null;
  onSenderPress?: () => void;
  timestamp?: string;
  messageType?: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'voice' | 'video' | 'file' | null;
  reactions?: ReactionSummary[];
  replyTo?: { body: string; senderName?: string } | null;
  status?: MessageStatus;
  bundled?: boolean;
  onLongPress?: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Baghdad',
  });
}

function StatusTicks({ status }: { status: MessageStatus }) {
  if (status === 'sending') return <Text style={styles.tick}>⏳</Text>;
  if (status === 'sent') return <Text style={styles.tick}>✔</Text>;
  if (status === 'read') return <Text style={[styles.tick, styles.tickRead]}>✔✔</Text>;
  return <Text style={styles.tick}>✔✔</Text>; // delivered
}

function MessageBubbleImpl({
  body, isMine, senderName, senderAvatarKey, onSenderPress, timestamp, messageType,
  attachmentUrl, attachmentType, reactions = [], replyTo, status, onLongPress,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const { duck, unduck } = useAmbientMusic();

  // The fullscreen video modal auto-plays with real sound (useNativeControls,
  // shouldPlay), so it should compete for attention with the ambient track,
  // not stack on top of it — ducked only while that specific modal is open.
  useEffect(() => {
    if (attachmentType !== 'video' || !fullscreen) return;
    duck();
    return () => unduck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachmentType, fullscreen]);

  if (messageType === 'payment_proposal') {
    let parsed: { method?: string; amount?: string | number; notes?: string } = {};
    try { parsed = JSON.parse(body); } catch { /* malformed payload — render with blank fields below */ }
    const methodColor = PAYMENT_METHOD_COLORS[parsed.method ?? ''] ?? COLORS.gold;
    const methodLabel = PAYMENT_METHOD_LABELS[parsed.method ?? ''] ?? parsed.method ?? '';
    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.paymentBubble, { borderColor: methodColor + '66' }]}>
          <View style={styles.paymentHeader}>
            <Text style={styles.paymentLabel}>💳 وصل دفع</Text>
            <View style={[styles.paymentStatusPill, { backgroundColor: '#22c55e26', borderColor: '#22c55e55' }]}>
              <Text style={styles.paymentStatusText}>✓ مؤكّد</Text>
            </View>
          </View>
          <View style={[styles.paymentMethodPill, { backgroundColor: methodColor + '22', borderColor: methodColor + '66' }]}>
            <Text style={[styles.paymentMethodText, { color: methodColor }]}>{methodLabel}</Text>
          </View>
          <Text style={styles.paymentAmount}>{Number(parsed.amount ?? 0).toLocaleString('ar-IQ')} د.ع</Text>
          {parsed.notes ? <Text style={styles.paymentNotes}>{parsed.notes}</Text> : null}
          {timestamp && <Text style={styles.paymentTime}>{formatTime(timestamp)}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      {!isMine && senderAvatarKey !== undefined && (
        <Pressable onPress={onSenderPress} disabled={!onSenderPress} style={styles.avatarSlot}>
          <Avatar avatarKey={senderAvatarKey} name={senderName ?? ''} size={28} />
        </Pressable>
      )}
      <Pressable onLongPress={onLongPress} delayLongPress={280} style={styles.bubbleWrap}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {isMine && (
            <LinearGradient
              colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          {!isMine && <View style={styles.shineLine} />}

          {!isMine && senderName && (
            <Pressable onPress={onSenderPress} disabled={!onSenderPress}>
              <Text style={styles.sender}>{senderName}</Text>
            </Pressable>
          )}

          {replyTo && (
            <View style={styles.replyQuote}>
              {replyTo.senderName && <Text style={styles.replyQuoteSender}>{replyTo.senderName}</Text>}
              <Text style={styles.replyQuoteBody} numberOfLines={1}>{replyTo.body}</Text>
            </View>
          )}

          {attachmentType === 'image' && attachmentUrl && (
            <Pressable onPress={() => setFullscreen(true)}>
              <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            </Pressable>
          )}

          {attachmentType === 'video' && attachmentUrl && (
            <Pressable onPress={() => setFullscreen(true)} style={styles.videoThumbWrap}>
              <Video
                source={{ uri: attachmentUrl }}
                style={styles.attachmentImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
                isMuted
                useNativeControls={false}
              />
              <View style={styles.playOverlay}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </Pressable>
          )}

          {attachmentType === 'voice' && attachmentUrl && (
            <VoiceMessagePlayer uri={attachmentUrl} isMine={isMine} />
          )}

          {attachmentType === 'file' && attachmentUrl && (
            <Pressable onPress={() => Linking.openURL(attachmentUrl)} style={styles.fileAttachment}>
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={[styles.fileName, isMine ? styles.textMine : styles.textTheirs]} numberOfLines={2}>
                {body.replace(/^📎\s*/, '') || 'ملف مرفق'}
              </Text>
            </Pressable>
          )}

          {body && messageType !== 'sticker' && messageType !== 'file' ? (
            <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>{body}</Text>
          ) : messageType === 'sticker' ? (
            hasTwemojiSticker(body) ? (
              <TwemojiSticker emoji={body} size={64} />
            ) : (
              <Text style={styles.stickerText}>{body}</Text>
            )
          ) : null}

          <View style={styles.metaRow}>
            {timestamp && <Text style={styles.time}>{formatTime(timestamp)}</Text>}
            {isMine && status && <StatusTicks status={status} />}
          </View>
        </View>

        {reactions.length > 0 && (
          <View style={[styles.reactionsPill, isMine ? styles.reactionsPillMine : styles.reactionsPillTheirs]}>
            {reactions.slice(0, 3).map((r) => (
              <Text key={r.emoji} style={styles.reactionEmoji}>{r.emoji}</Text>
            ))}
            {reactions.length > 1 && (
              <Text style={styles.reactionCount}>{reactions.reduce((s, r) => s + r.count, 0)}</Text>
            )}
          </View>
        )}
      </Pressable>

      {attachmentType === 'image' && attachmentUrl && (
        <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
          <Pressable style={styles.fullscreenOverlay} onPress={() => setFullscreen(false)}>
            <Image source={{ uri: attachmentUrl }} style={styles.fullscreenImage} contentFit="contain" cachePolicy="memory-disk" />
          </Pressable>
        </Modal>
      )}

      {attachmentType === 'video' && attachmentUrl && (
        <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
          <View style={styles.fullscreenOverlay}>
            <Pressable style={styles.fullscreenCloseBtn} onPress={() => setFullscreen(false)} hitSlop={12}>
              <Text style={styles.fullscreenCloseText}>✕</Text>
            </Pressable>
            <Video
              source={{ uri: attachmentUrl }}
              style={styles.fullscreenVideo}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              shouldPlay
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

function reactionsEqual(a: ReactionSummary[] = [], b: ReactionSummary[] = []): boolean {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.emoji === b[i].emoji && r.count === b[i].count && r.mine === b[i].mine);
}

function replyToEqual(a: Props['replyTo'], b: Props['replyTo']): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.body === b.body && a.senderName === b.senderName;
}

// Every call site rebuilds `renderItem` on each render of its screen (the
// message list, reactions, and typing state all live there), which hands
// this component fresh reactions/replyTo array-and-object literals and new
// onSenderPress/onLongPress closures every time — a plain React.memo would
// never bail out, since none of those pass a reference-equality check even
// when nothing the user can see actually changed. Comparing the fields that
// actually affect the render (and deliberately ignoring the two callback
// props, which only ever close over this same message's stable id) makes
// the memo real: an unrelated re-render of the screen (e.g. a keystroke in
// the composer) no longer re-renders every currently-mounted bubble.
function messageBubblePropsEqual(prev: Props, next: Props): boolean {
  return (
    prev.body === next.body &&
    prev.isMine === next.isMine &&
    prev.senderName === next.senderName &&
    prev.senderAvatarKey === next.senderAvatarKey &&
    prev.timestamp === next.timestamp &&
    prev.messageType === next.messageType &&
    prev.attachmentUrl === next.attachmentUrl &&
    prev.attachmentType === next.attachmentType &&
    prev.status === next.status &&
    prev.bundled === next.bundled &&
    reactionsEqual(prev.reactions, next.reactions) &&
    replyToEqual(prev.replyTo, next.replyTo)
  );
}

export const MessageBubble = memo(MessageBubbleImpl, messageBubblePropsEqual);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  // I18nManager.isRTL is genuinely active on real devices (confirmed via a
  // founder screenshot showing "mine" rendering on the physical left) — RN
  // auto-mirrors a plain 'row' container's main axis under RTL, so
  // flex-end/flex-start here resolve to the OPPOSITE physical side from
  // their LTR meaning. Swapped so "mine" still lands on the physical right.
  rowMine: { justifyContent: 'flex-start' },
  rowTheirs: { justifyContent: 'flex-end' },
  bubbleWrap: { maxWidth: '78%' },
  avatarSlot: { marginEnd: 6, alignSelf: 'flex-end', marginBottom: 2 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  bubbleMine: {
    backgroundColor: '#d97706',
    borderBottomEndRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bubbleTheirs: {
    backgroundColor: '#21262d',
    borderBottomStartRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.22)',
  },
  shineLine: { position: 'absolute', top: 0, left: 10, right: 10, height: 1, backgroundColor: 'rgba(230,171,44,0.35)' },
  sender: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: COLORS.goldBright,
    marginBottom: 3,
    textAlign: 'right',
  },
  // "Simplified Arabic Bold" (the founder's literal request) is a
  // proprietary Microsoft-bundled font, not freely redistributable inside
  // an app bundle — using the app's existing licensed bold face here
  // (Cairo Bold, already used for names/timestamps app-wide) instead.
  text: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    lineHeight: 22,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  textMine: { color: '#fff' },
  textTheirs: { color: COLORS.white },
  stickerText: { fontSize: 52, textAlign: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  time: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  tick: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  tickRead: { color: '#5bc8ff' },

  replyQuote: {
    borderStartWidth: 3,
    borderStartColor: COLORS.gold,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  replyQuoteSender: { fontFamily: FONTS.bold, fontSize: 11, color: COLORS.goldBright, textAlign: 'right' },
  replyQuoteBody: { fontFamily: FONTS.regular, fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'right' },

  attachmentImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 6 },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
    maxWidth: 220,
  },
  fileIcon: { fontSize: 22 },
  fileName: { fontFamily: FONTS.regular, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  videoThumbWrap: { position: 'relative' },
  playOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 22,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 44,
    height: 44,
    borderRadius: 22,
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
  },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  fullscreenVideo: { width: '100%', height: '80%' },
  fullscreenCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCloseText: { fontSize: 16, color: '#fff', fontFamily: FONTS.bold },

  reactionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: COLORS.goldBorder,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reactionsPillMine: { left: -4 },
  reactionsPillTheirs: { right: -4 },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.muted, marginRight: 2 },

  paymentBubble: {
    minWidth: 220,
    maxWidth: '82%',
    backgroundColor: 'rgba(22,27,34,0.92)',
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paymentLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.white,
  },
  paymentStatusPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  paymentStatusText: { fontFamily: FONTS.bold, fontSize: 10, color: '#4ade80' },
  paymentMethodPill: { alignSelf: 'flex-end', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  paymentMethodText: { fontFamily: FONTS.bold, fontSize: 12 },
  paymentAmount: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
    textAlign: 'right',
  },
  paymentNotes: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
  },
  paymentTime: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },
});
