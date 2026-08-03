import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '@/constants/theme';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { Avatar } from './Avatar';

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
  attachmentType?: 'image' | 'voice' | null;
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

export function MessageBubble({
  body, isMine, senderName, senderAvatarKey, onSenderPress, timestamp, messageType,
  attachmentUrl, attachmentType, reactions = [], replyTo, status, onLongPress,
}: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  if (messageType === 'payment_proposal') {
    let parsed = { method: '', amount: '', notes: '' };
    try { parsed = JSON.parse(body); } catch {}
    return (
      <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
        <View style={styles.paymentBubble}>
          <Text style={styles.paymentLabel}>💰 اتفاقية دفع</Text>
          <Text style={styles.paymentText}>{parsed.method === 'zaincash' ? 'ZainCash' : 'Qi Card'}</Text>
          <Text style={styles.paymentText}>{Number(parsed.amount).toLocaleString('ar-IQ')} IQD</Text>
          {parsed.notes ? <Text style={styles.paymentNotes}>{parsed.notes}</Text> : null}
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
              <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} resizeMode="cover" />
            </Pressable>
          )}

          {attachmentType === 'voice' && attachmentUrl && (
            <VoiceMessagePlayer uri={attachmentUrl} isMine={isMine} />
          )}

          {body && messageType !== 'sticker' ? (
            <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>{body}</Text>
          ) : messageType === 'sticker' ? (
            <Text style={styles.stickerText}>{body}</Text>
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
            <Image source={{ uri: attachmentUrl }} style={styles.fullscreenImage} resizeMode="contain" />
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 12 },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
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
  text: {
    fontFamily: FONTS.regular,
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
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },

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
    backgroundColor: 'rgba(230,171,44,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(230,171,44,0.4)',
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 4,
  },
  paymentLabel: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.gold,
    textAlign: 'right',
  },
  paymentText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.white,
    textAlign: 'right',
  },
  paymentNotes: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
